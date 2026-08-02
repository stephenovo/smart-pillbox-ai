/*
  Smart Pillbox AI - ESP32-S3 hardware MVP

  Required Arduino libraries:
  - ArduinoJson 7.x
  - Adafruit GFX Library
  - Adafruit SSD1306

  Copy config.example.h to config.h and update Wi-Fi/server settings first.
  Verify the GPIO map against the exact ESP32-S3 DevKitC board before wiring.
*/

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <Wire.h>

#include "config.h"

constexpr uint8_t SLOT_COUNT = 8;
constexpr unsigned long DEBOUNCE_MS = 80;
constexpr unsigned long STATE_POLL_MS = 1500;
constexpr unsigned long WIFI_RETRY_MS = 5000;
constexpr unsigned long HTTP_TIMEOUT_MS = 1500;
constexpr unsigned long WRONG_WARNING_MS = 2000;
constexpr unsigned long TEMP_MESSAGE_MS = 2000;
constexpr uint8_t MAX_UPLOAD_ATTEMPTS = 3;
constexpr uint8_t EVENT_QUEUE_SIZE = 12;

// Safe defaults for a common ESP32-S3 DevKitC-1. Change only this block.
const uint8_t REED_PINS[SLOT_COUNT] = {4, 5, 6, 7, 15, 16, 17, 18};
const uint8_t GREEN_LED_PINS[SLOT_COUNT] = {8, 9, 10, 11, 12, 13, 14, 21};
// Start with Slot 1 only. Change every value to true after all eight sensors work.
const bool SLOT_ENABLED[SLOT_COUNT] = {
  true, false, false, false, false, false, false, false
};
constexpr uint8_t BUZZER_PIN = 38;
constexpr uint8_t RED_LED_PIN = 39;
constexpr uint8_t OLED_SDA_PIN = 41;
constexpr uint8_t OLED_SCL_PIN = 42;

// Most 3.3 V reed modules output LOW while the lid magnet is close.
// Change this one value to HIGH if Serial Monitor proves your module is inverted.
constexpr int REED_CLOSED_LEVEL = LOW;

constexpr uint8_t SCREEN_WIDTH = 128;
constexpr uint8_t SCREEN_HEIGHT = 64;
constexpr uint8_t OLED_ADDRESS = 0x3C;
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

struct QueuedEvent {
  uint8_t slotId;
  String eventType;
  uint8_t attempts;
  unsigned long nextAttemptAt;
  bool correctSlot;
};

bool rawOpenState[SLOT_COUNT];
bool stableOpenState[SLOT_COUNT];
unsigned long rawChangedAt[SLOT_COUNT];

QueuedEvent eventQueue[EVENT_QUEUE_SIZE];
uint8_t queueHead = 0;
uint8_t queueTail = 0;
uint8_t queueCount = 0;

bool oledReady = false;
bool reminderActive = false;
uint8_t activeSlot = 0;
uint8_t locallyAcknowledgedSlot = 0;
unsigned long lastStatePollAt = 0;
unsigned long lastWifiAttemptAt = 0;
unsigned long wrongWarningStartedAt = 0;
unsigned long temporaryMessageUntil = 0;

String stateEndpoint() {
  return String(SERVER_BASE_URL) + "/api/hardware/state?deviceId=" +
         String(DEVICE_ID) + "&heartbeat=1";
}

String eventEndpoint() {
  return String(SERVER_BASE_URL) + "/api/hardware/events";
}

void showMessage(const String& firstLine, const String& secondLine = "") {
  if (!oledReady) return;

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 10);
  display.println(firstLine);
  display.setTextSize(2);
  display.setCursor(0, 32);
  display.println(secondLine);
  display.display();
}

void showCurrentState() {
  if (reminderActive) {
    showMessage("MEDICATION TIME", "OPEN SLOT " + String(activeSlot));
  } else if (WiFi.status() == WL_CONNECTED) {
    showMessage("READY", "NO REMINDER");
  } else {
    showMessage("SMART PILLBOX", "WIFI OFFLINE");
  }
}

bool readSlotOpen(uint8_t index) {
  return digitalRead(REED_PINS[index]) != REED_CLOSED_LEVEL;
}

void setAllSlotLeds(bool enabled) {
  for (uint8_t index = 0; index < SLOT_COUNT; index++) {
    digitalWrite(GREEN_LED_PINS[index], enabled ? HIGH : LOW);
  }
}

void setReminderState(bool enabled, uint8_t slotId = 0) {
  reminderActive = enabled;
  activeSlot = enabled ? slotId : 0;
  setAllSlotLeds(false);

  if (enabled && slotId >= 1 && slotId <= SLOT_COUNT) {
    digitalWrite(GREEN_LED_PINS[slotId - 1], HIGH);
  }

  if (millis() >= temporaryMessageUntil) showCurrentState();
}

void startWifiConnection() {
  lastWifiAttemptAt = millis();
  Serial.print("[WiFi] Connecting to ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void maintainWifi(unsigned long now) {
  static wl_status_t previousStatus = WL_NO_SHIELD;
  const wl_status_t status = WiFi.status();

  if (status != previousStatus) {
    previousStatus = status;
    if (status == WL_CONNECTED) {
      Serial.print("[WiFi] Connected. ESP32 IP: ");
      Serial.println(WiFi.localIP());
      if (now >= temporaryMessageUntil) showCurrentState();
    }
  }

  if (status != WL_CONNECTED && now - lastWifiAttemptAt >= WIFI_RETRY_MS) {
    startWifiConnection();
  }
}

void addDeviceKeyHeader(HTTPClient& http) {
  if (String(DEVICE_API_KEY).length() > 0) {
    http.addHeader("X-Device-Key", DEVICE_API_KEY);
  }
}

bool enqueueEvent(uint8_t slotId, const String& eventType, bool correctSlot) {
  if (queueCount >= EVENT_QUEUE_SIZE) {
    Serial.println("[Event] Queue full; opening could not be queued.");
    return false;
  }

  eventQueue[queueTail] = {slotId, eventType, 0, 0, correctSlot};
  queueTail = (queueTail + 1) % EVENT_QUEUE_SIZE;
  queueCount++;

  Serial.printf("[Event] Queued %s for Slot %u. Queue=%u\n",
                eventType.c_str(), slotId, queueCount);
  return true;
}

void removeQueuedEvent() {
  if (queueCount == 0) return;
  queueHead = (queueHead + 1) % EVENT_QUEUE_SIZE;
  queueCount--;
}

bool uploadEvent(const QueuedEvent& queuedEvent) {
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.begin(eventEndpoint());
  http.addHeader("Content-Type", "application/json");
  addDeviceKeyHeader(http);

  JsonDocument document;
  document["deviceId"] = DEVICE_ID;
  document["slotId"] = queuedEvent.slotId;
  document["eventType"] = queuedEvent.eventType;
  document["firmwareVersion"] = FIRMWARE_VERSION;
  String body;
  serializeJson(document, body);

  const int statusCode = http.POST(body);
  const String response = http.getString();
  http.end();

  Serial.printf("[HTTP] POST event -> %d %s\n", statusCode, response.c_str());
  return statusCode >= 200 && statusCode < 300;
}

void processEventQueue(unsigned long now) {
  if (queueCount == 0 || WiFi.status() != WL_CONNECTED) return;

  QueuedEvent& queuedEvent = eventQueue[queueHead];
  if (now < queuedEvent.nextAttemptAt) return;

  if (uploadEvent(queuedEvent)) {
    if (queuedEvent.correctSlot) {
      showMessage("SLOT " + String(queuedEvent.slotId) + " OPENED", "UPLOADED");
      temporaryMessageUntil = now + TEMP_MESSAGE_MS;
    }
    removeQueuedEvent();
    return;
  }

  queuedEvent.attempts++;
  if (queuedEvent.attempts >= MAX_UPLOAD_ATTEMPTS) {
    Serial.println("[Event] Upload failed after 3 attempts; event removed.");
    showMessage("UPLOAD FAILED", "CHECK SERVER");
    temporaryMessageUntil = now + TEMP_MESSAGE_MS;
    removeQueuedEvent();
    return;
  }

  queuedEvent.nextAttemptAt = now + 1000UL * queuedEvent.attempts;
  showMessage("UPLOAD FAILED", "RETRYING");
  temporaryMessageUntil = now + 900;
}

void pollDeviceState(unsigned long now) {
  if (WiFi.status() != WL_CONNECTED || now - lastStatePollAt < STATE_POLL_MS) {
    return;
  }
  lastStatePollAt = now;

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.begin(stateEndpoint());
  addDeviceKeyHeader(http);
  const int statusCode = http.GET();

  if (statusCode < 200 || statusCode >= 300) {
    Serial.printf("[HTTP] GET state failed -> %d\n", statusCode);
    http.end();
    return;
  }

  JsonDocument document;
  const DeserializationError error = deserializeJson(document, http.getStream());
  http.end();
  if (error) {
    Serial.printf("[HTTP] Invalid state JSON: %s\n", error.c_str());
    return;
  }

  const String status = document["status"] | "idle";
  const uint8_t nextActiveSlot = document["activeSlot"] | 0;

  if (
    status == "reminding" &&
    nextActiveSlot >= 1 &&
    nextActiveSlot <= SLOT_COUNT &&
    locallyAcknowledgedSlot != nextActiveSlot
  ) {
    if (!reminderActive || activeSlot != nextActiveSlot) {
      Serial.printf("[State] Reminder active for Slot %u.\n", nextActiveSlot);
      setReminderState(true, nextActiveSlot);
    }
  } else if (status == "idle") {
    locallyAcknowledgedSlot = 0;
    if (reminderActive) {
      Serial.println("[State] Reminder stopped by server.");
      setReminderState(false);
    }
  }
}

void handleOpenedSlot(uint8_t slotId, unsigned long now) {
  const bool isCorrectSlot = reminderActive && slotId == activeSlot;
  const bool isWrongSlot = reminderActive && slotId != activeSlot;
  const String eventType = isWrongSlot ? "wrong_slot_open" : "lid_open";

  Serial.printf("[Sensor] Slot %u opened (%s).\n", slotId, eventType.c_str());
  enqueueEvent(slotId, eventType, isCorrectSlot);

  if (isCorrectSlot) {
    locallyAcknowledgedSlot = slotId;
    setReminderState(false);
    showMessage("SLOT " + String(slotId) + " OPENED", "UPLOADING");
    temporaryMessageUntil = now + TEMP_MESSAGE_MS;
  } else if (isWrongSlot) {
    wrongWarningStartedAt = now;
    showMessage("WRONG SLOT " + String(slotId), "OPEN SLOT " + String(activeSlot));
    temporaryMessageUntil = now + WRONG_WARNING_MS;
  }
}

void scanReedSensors(unsigned long now) {
  for (uint8_t index = 0; index < SLOT_COUNT; index++) {
    if (!SLOT_ENABLED[index]) continue;
    const bool rawIsOpen = readSlotOpen(index);

    if (rawIsOpen != rawOpenState[index]) {
      rawOpenState[index] = rawIsOpen;
      rawChangedAt[index] = now;
    }

    if (
      rawIsOpen != stableOpenState[index] &&
      now - rawChangedAt[index] >= DEBOUNCE_MS
    ) {
      const bool wasOpen = stableOpenState[index];
      stableOpenState[index] = rawIsOpen;
      Serial.printf("[Sensor] Slot %u is now %s.\n", index + 1,
                    rawIsOpen ? "OPEN" : "CLOSED");

      if (!wasOpen && rawIsOpen) {
        handleOpenedSlot(index + 1, now);
      }
    }
  }
}

void updateIndicators(unsigned long now) {
  const bool wrongWarningActive =
    wrongWarningStartedAt > 0 && now - wrongWarningStartedAt < WRONG_WARNING_MS;

  if (wrongWarningActive) {
    digitalWrite(RED_LED_PIN, HIGH);
    digitalWrite(BUZZER_PIN, ((now - wrongWarningStartedAt) / 100) % 2 == 0);
  } else {
    digitalWrite(RED_LED_PIN, LOW);
    const bool reminderBeep = reminderActive && now % 1000 < 350;
    digitalWrite(BUZZER_PIN, reminderBeep ? HIGH : LOW);
  }

  if (temporaryMessageUntil > 0 && now >= temporaryMessageUntil) {
    temporaryMessageUntil = 0;
    showCurrentState();
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n[Boot] Smart Pillbox AI starting.");

  for (uint8_t index = 0; index < SLOT_COUNT; index++) {
    pinMode(REED_PINS[index], SLOT_ENABLED[index] ? INPUT : INPUT_PULLUP);
    pinMode(GREEN_LED_PINS[index], OUTPUT);
    digitalWrite(GREEN_LED_PINS[index], LOW);
    rawOpenState[index] = SLOT_ENABLED[index] ? readSlotOpen(index) : false;
    stableOpenState[index] = rawOpenState[index];
    rawChangedAt[index] = 0;
    if (SLOT_ENABLED[index]) {
      Serial.printf("[Sensor] Slot %u boot state: %s.\n", index + 1,
                    stableOpenState[index] ? "OPEN" : "CLOSED");
    }
  }

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(RED_LED_PIN, LOW);

  Wire.begin(OLED_SDA_PIN, OLED_SCL_PIN);
  oledReady = display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS);
  if (!oledReady) {
    Serial.println("[OLED] SSD1306 not found; continuing without display.");
  } else {
    showMessage("SMART PILLBOX", "CONNECTING WIFI");
  }

  startWifiConnection();
  Serial.println("[Boot] Sensor loop ready.");
}

void loop() {
  const unsigned long now = millis();
  scanReedSensors(now);
  maintainWifi(now);
  processEventQueue(now);
  pollDeviceState(now);
  updateIndicators(now);
  delay(5);
}
