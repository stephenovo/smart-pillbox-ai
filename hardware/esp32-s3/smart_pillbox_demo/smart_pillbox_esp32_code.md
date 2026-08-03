# Smart Pillbox ESP32 Arduino Code

Source file: smart_pillbox_esp32.ino

```cpp
/*
  Smart Pillbox AI - ESP32-S3 firmware for the web demo

  First goal for beginners:
  - Keep OFFLINE_DEMO_MODE = true.
  - Wire only Slot 3 LED, Slot 3 reed switch, buzzer, and OLED.
  - Upload this sketch and test the physical lid-open loop.

  Web integration goal:
  - Start the Next.js web demo on your laptop.
  - Set OFFLINE_DEMO_MODE = false.
  - Fill WIFI_SSID, WIFI_PASSWORD, and SERVER_BASE_URL.
  - ESP32 will poll /api/hardware/state and POST /api/hardware/events.
*/

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <Wire.h>

// ---------- 1. Change these beginner settings first ----------

const bool OFFLINE_DEMO_MODE = true;

const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Use your laptop's LAN IP, not localhost, when ESP32 connects to the web app.
// Example: "http://192.168.1.23:3000"
const char* SERVER_BASE_URL = "http://YOUR_LAPTOP_IP:3000";

const char* DEVICE_ID = "PILLBOX-DEMO-001";
const char* FIRMWARE_VERSION = "esp32-s3-mvp-0.3.0";

// Most reed switch modules output LOW when the magnet is close, meaning closed.
// If Serial Monitor shows OPEN/CLOSED reversed, change this to HIGH.
const int REED_CLOSED_LEVEL = LOW;

// Start with Slot 3 only. Enable Slot 5 later when testing wrong-slot behavior.
const bool SLOT_ENABLED[8] = {
  false, false, true, false, false, false, false, false
};

// Offline demo starts a Slot 3 reminder by itself after 10 seconds.
const int OFFLINE_DEMO_ACTIVE_SLOT = 3;
const unsigned long OFFLINE_DEMO_DELAY_MS = 10000;

// ---------- 2. Pin map ----------
// Check the printed labels on your ESP32-S3 board. Change these arrays if needed.

const uint8_t SLOT_COUNT = 8;

const uint8_t REED_PINS[SLOT_COUNT] = {
  4, 5, 6, 7, 15, 16, 17, 18
};

const uint8_t GREEN_LED_PINS[SLOT_COUNT] = {
  1, 2, 3, 10, 11, 12, 13, 14
};

const uint8_t OLED_SDA_PIN = 8;
const uint8_t OLED_SCL_PIN = 9;
const uint8_t RED_LED_PIN = 21;
const uint8_t BUZZER_PIN = 35;

// ---------- 3. Timing ----------

const unsigned long REED_DEBOUNCE_MS = 80;
const unsigned long STATE_POLL_MS = 1500;
const unsigned long WIFI_RETRY_MS = 5000;
const unsigned long HTTP_TIMEOUT_MS = 1500;
const unsigned long NORMAL_BEEP_PERIOD_MS = 1000;
const unsigned long NORMAL_BEEP_ON_MS = 250;
const unsigned long WRONG_SLOT_ALERT_MS = 2000;
const unsigned long TEMP_MESSAGE_MS = 2000;

// ---------- 4. OLED ----------

const uint8_t SCREEN_WIDTH = 128;
const uint8_t SCREEN_HEIGHT = 64;
const uint8_t OLED_ADDRESS = 0x3C;
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ---------- 5. Device state ----------

bool oledReady = false;
bool reminderActive = false;
uint8_t activeSlot = 0;
uint8_t locallyAcknowledgedSlot = 0;

bool rawOpenState[SLOT_COUNT];
bool stableOpenState[SLOT_COUNT];
unsigned long rawChangedAt[SLOT_COUNT];

unsigned long bootAt = 0;
bool offlineDemoStarted = false;
unsigned long lastStatePollAt = 0;
unsigned long lastWifiAttemptAt = 0;
unsigned long wrongSlotAlertUntil = 0;
unsigned long temporaryMessageUntil = 0;

String stateEndpoint() {
  return String(SERVER_BASE_URL) + "/api/hardware/state?deviceId=" +
         String(DEVICE_ID) + "&heartbeat=1";
}

String eventEndpoint() {
  return String(SERVER_BASE_URL) + "/api/hardware/events";
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println();
  Serial.println("[Boot] Smart Pillbox AI ESP32-S3 starting.");

  setupPins();
  setupOled();

  bootAt = millis();

  if (OFFLINE_DEMO_MODE) {
    Serial.println("[Mode] OFFLINE_DEMO_MODE is ON.");
    showMessage("DEMO MODE", "WAIT 10 SEC");
  } else {
    showMessage("SMART PILLBOX", "CONNECT WIFI");
    startWifiConnection();
  }
}

void loop() {
  const unsigned long now = millis();

  scanReedSensors(now);

  if (OFFLINE_DEMO_MODE) {
    startOfflineDemoIfNeeded(now);
  } else {
    maintainWifi(now);
    pollDeviceState(now);
  }

  updateIndicators(now);
  delay(5);
}

void setupPins() {
  for (uint8_t index = 0; index < SLOT_COUNT; index++) {
    pinMode(GREEN_LED_PINS[index], OUTPUT);
    digitalWrite(GREEN_LED_PINS[index], LOW);

    pinMode(REED_PINS[index], INPUT_PULLUP);
    rawOpenState[index] = SLOT_ENABLED[index] ? readSlotOpen(index) : false;
    stableOpenState[index] = rawOpenState[index];
    rawChangedAt[index] = millis();

    if (SLOT_ENABLED[index]) {
      Serial.print("[Sensor] Slot ");
      Serial.print(index + 1);
      Serial.print(" boot state: ");
      Serial.println(stableOpenState[index] ? "OPEN" : "CLOSED");
    }
  }

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(RED_LED_PIN, LOW);
}

void setupOled() {
  Wire.begin(OLED_SDA_PIN, OLED_SCL_PIN);
  oledReady = display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS);

  if (!oledReady) {
    Serial.println("[OLED] SSD1306 not found at 0x3C. Check SDA/SCL/VCC/GND.");
    return;
  }

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.display();
}

bool readSlotOpen(uint8_t index) {
  return digitalRead(REED_PINS[index]) != REED_CLOSED_LEVEL;
}

void startOfflineDemoIfNeeded(unsigned long now) {
  if (offlineDemoStarted || now - bootAt < OFFLINE_DEMO_DELAY_MS) {
    return;
  }

  offlineDemoStarted = true;
  setReminderState(true, OFFLINE_DEMO_ACTIVE_SLOT);
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
      if (now >= temporaryMessageUntil) {
        showCurrentState();
      }
    } else {
      Serial.println("[WiFi] Not connected.");
    }
  }

  if (status != WL_CONNECTED && now - lastWifiAttemptAt >= WIFI_RETRY_MS) {
    startWifiConnection();
  }
}

void pollDeviceState(unsigned long now) {
  if (WiFi.status() != WL_CONNECTED || now - lastStatePollAt < STATE_POLL_MS) {
    return;
  }

  lastStatePollAt = now;

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.begin(stateEndpoint());

  const int statusCode = http.GET();
  if (statusCode < 200 || statusCode >= 300) {
    Serial.print("[HTTP] GET state failed: ");
    Serial.println(statusCode);
    http.end();
    return;
  }

  StaticJsonDocument<512> doc;
  const DeserializationError error = deserializeJson(doc, http.getStream());
  http.end();

  if (error) {
    Serial.print("[HTTP] State JSON error: ");
    Serial.println(error.c_str());
    return;
  }

  const String status = doc["status"] | "idle";
  const uint8_t nextActiveSlot = doc["activeSlot"] | 0;

  if (
    status == "reminding" &&
    nextActiveSlot >= 1 &&
    nextActiveSlot <= SLOT_COUNT &&
    locallyAcknowledgedSlot != nextActiveSlot
  ) {
    if (!reminderActive || activeSlot != nextActiveSlot) {
      Serial.print("[State] Reminder active for Slot ");
      Serial.println(nextActiveSlot);
      setReminderState(true, nextActiveSlot);
    }
    return;
  }

  if (status == "idle") {
    locallyAcknowledgedSlot = 0;
    if (reminderActive) {
      Serial.println("[State] Reminder stopped by server.");
      setReminderState(false);
    } else if (now >= temporaryMessageUntil) {
      showCurrentState();
    }
  }
}

void scanReedSensors(unsigned long now) {
  for (uint8_t index = 0; index < SLOT_COUNT; index++) {
    if (!SLOT_ENABLED[index]) {
      continue;
    }

    const bool rawIsOpen = readSlotOpen(index);

    if (rawIsOpen != rawOpenState[index]) {
      rawOpenState[index] = rawIsOpen;
      rawChangedAt[index] = now;
    }

    if (
      rawIsOpen != stableOpenState[index] &&
      now - rawChangedAt[index] >= REED_DEBOUNCE_MS
    ) {
      const bool wasOpen = stableOpenState[index];
      stableOpenState[index] = rawIsOpen;

      Serial.print("[Sensor] Slot ");
      Serial.print(index + 1);
      Serial.print(" is now ");
      Serial.println(rawIsOpen ? "OPEN" : "CLOSED");

      if (!wasOpen && rawIsOpen) {
        handleOpenedSlot(index + 1, now);
      }
    }
  }
}

void handleOpenedSlot(uint8_t openedSlot, unsigned long now) {
  const bool correctSlot = reminderActive && openedSlot == activeSlot;
  const bool wrongSlot = reminderActive && openedSlot != activeSlot;
  const char* eventType = wrongSlot ? "wrong_slot_open" : "lid_open";

  Serial.print("[Event] ");
  Serial.print(eventType);
  Serial.print(" Slot ");
  Serial.println(openedSlot);

  bool uploaded = false;
  if (!OFFLINE_DEMO_MODE) {
    uploaded = uploadEvent(openedSlot, eventType);
  } else {
    Serial.println("[Event] Offline demo mode: not uploaded.");
  }

  if (correctSlot) {
    locallyAcknowledgedSlot = openedSlot;
    setReminderState(false);
    showMessage("SLOT " + String(openedSlot) + " OPENED",
                uploaded ? "UPLOADED" : "LOCAL OK");
    temporaryMessageUntil = now + TEMP_MESSAGE_MS;
    return;
  }

  if (wrongSlot) {
    wrongSlotAlertUntil = now + WRONG_SLOT_ALERT_MS;
    showMessage("WRONG SLOT " + String(openedSlot),
                "OPEN SLOT " + String(activeSlot));
    temporaryMessageUntil = now + WRONG_SLOT_ALERT_MS;
    return;
  }

  showMessage("SLOT " + String(openedSlot) + " OPENED",
              uploaded ? "UPLOADED" : "NO REMINDER");
  temporaryMessageUntil = now + TEMP_MESSAGE_MS;
}

bool uploadEvent(uint8_t slotId, const char* eventType) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] WiFi offline. Event not uploaded.");
    return false;
  }

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.begin(eventEndpoint());
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<384> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["slotId"] = slotId;
  doc["eventType"] = eventType;
  doc["deviceTimestamp"] = String(millis());
  doc["firmwareVersion"] = FIRMWARE_VERSION;

  String body;
  serializeJson(doc, body);

  const int statusCode = http.POST(body);
  const String response = http.getString();
  http.end();

  Serial.print("[HTTP] POST event status ");
  Serial.print(statusCode);
  Serial.print(": ");
  Serial.println(response);

  return statusCode >= 200 && statusCode < 300;
}

void setReminderState(bool enabled, uint8_t slotId = 0) {
  reminderActive = enabled;
  activeSlot = enabled ? slotId : 0;

  for (uint8_t index = 0; index < SLOT_COUNT; index++) {
    digitalWrite(GREEN_LED_PINS[index], LOW);
  }

  if (enabled && slotId >= 1 && slotId <= SLOT_COUNT) {
    digitalWrite(GREEN_LED_PINS[slotId - 1], HIGH);
  } else {
    digitalWrite(BUZZER_PIN, LOW);
  }

  if (millis() >= temporaryMessageUntil) {
    showCurrentState();
  }
}

void updateIndicators(unsigned long now) {
  const bool wrongSlotAlertActive = now < wrongSlotAlertUntil;

  if (wrongSlotAlertActive) {
    digitalWrite(RED_LED_PIN, HIGH);
    digitalWrite(BUZZER_PIN, ((now / 100) % 2) == 0 ? HIGH : LOW);
  } else {
    digitalWrite(RED_LED_PIN, LOW);
    const bool reminderBeep =
      reminderActive && (now % NORMAL_BEEP_PERIOD_MS) < NORMAL_BEEP_ON_MS;
    digitalWrite(BUZZER_PIN, reminderBeep ? HIGH : LOW);
  }

  if (temporaryMessageUntil > 0 && now >= temporaryMessageUntil) {
    temporaryMessageUntil = 0;
    showCurrentState();
  }
}

void showCurrentState() {
  if (reminderActive) {
    showMessage("MEDICATION TIME", "OPEN SLOT " + String(activeSlot));
  } else if (OFFLINE_DEMO_MODE) {
    showMessage("DEMO READY", "NO REMINDER");
  } else if (WiFi.status() == WL_CONNECTED) {
    showMessage("READY", "NO REMINDER");
  } else {
    showMessage("SMART PILLBOX", "WIFI OFFLINE");
  }
}

void showMessage(const String& line1, const String& line2) {
  Serial.print("[OLED] ");
  Serial.print(line1);
  Serial.print(" / ");
  Serial.println(line2);

  if (!oledReady) {
    return;
  }

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("Smart Pillbox AI");

  display.setTextSize(line1.length() > 12 ? 1 : 2);
  display.setCursor(0, 20);
  display.println(line1);

  display.setTextSize(1);
  display.setCursor(0, 52);
  display.println(line2);
  display.display();
}

```
