# Smart Pillbox AI Hardware Prep

零基础接线、烧录和完整联调步骤见：

```text
docs/HARDWARE_MVP_SETUP.md
```

This folder prepares the web app for the ESP32-S3 MVP hardware demo.

## MVP Hardware Target

The first hardware version should prove the full loop:

1. Caregiver configures medication schedule in the web app.
2. ESP32-S3 triggers LED and buzzer reminders.
3. User opens a physical pillbox lid.
4. Reed-switch sensor detects the lid opening.
5. ESP32-S3 uploads the event to the web dashboard.
6. Dashboard and AI panels update from the recorded opening event.

The PDF hardware plan intentionally avoids batteries, custom PCB, motors, camera, microphone, RTC, and weight sensors for the first MVP. Keep the first build simple and stable.

## Buy First

Core:

- ESP32-S3 DevKitC Type-C development board x2
- Type-C data cable x2
- 5V 2A USB power adapter x1

Lid detection:

- Normally-open reed-switch sensor module with DO output, 3.3V compatible x10
- Neodymium disc magnets, 5x2 mm x10
- Neodymium disc magnets, 6x2 mm x10
- Transparent PP flip-lid small boxes, 4-6 cm wide x10

Reminder outputs:

- 5 mm high-brightness green LED x10
- 5 mm high-brightness red LED x5
- 220 ohm or 330 ohm resistor x30
- Active buzzer module, 3.3V/5V high-level trigger x2
- 0.96 inch SSD1306 I2C OLED, 128x64, four-pin x1

Wiring and structure:

- MB-102 breadboard x2
- Male-to-male jumper wires x1 pack
- Male-to-female jumper wires x1 pack
- Female-to-female jumper wires x1 pack
- 28 AWG multi-color silicone wire, 5-10 m
- Perfboard x2
- Pin headers and screw terminals
- 3 mm PVC foam board or acrylic base x1
- Small plastic electronics project box x1
- 3M double-sided tape x1
- Hot glue gun and glue sticks x1
- Heat-shrink tube kit x1
- Cable ties or cable-management tape x1

Tools:

- Digital multimeter
- Temperature-controlled soldering iron
- Solder wire
- Wire stripper
- Small diagonal cutter
- Small screwdriver kit
- Electrical tape

## Web API Prepared For ESP32

Run the web app locally:

```bash
npm run dev -- -H 0.0.0.0 -p 3000
```

Find your laptop LAN IP, for example `192.168.1.23`. The ESP32 must use that IP, not `localhost`.

### Get Demo Plan

```http
GET http://YOUR_LAPTOP_IP:3000/api/hardware/plan
```

Response shape:

```json
{
  "deviceId": "PILLBOX-DEMO-001",
  "serverTime": "2026-08-02T00:00:00.000Z",
  "slots": [
    {
      "slotId": 1,
      "medication": "Blood Pressure Pill",
      "scheduledTime": "08:00",
      "highRisk": true,
      "bufferTimeMinutes": 30
    }
  ]
}
```

Saving the Initialisation page POSTs the current plan to the same endpoint.

### Read Or Control Reminder State

ESP32 heartbeat and state polling:

```http
GET http://YOUR_LAPTOP_IP:3000/api/hardware/state?deviceId=PILLBOX-DEMO-001&heartbeat=1
```

Immediate demo reminder:

```http
POST http://YOUR_LAPTOP_IP:3000/api/hardware/state
Content-Type: application/json

{
  "deviceId": "PILLBOX-DEMO-001",
  "status": "reminding",
  "activeSlot": 3
}
```

### Upload Lid Event

```http
POST http://YOUR_LAPTOP_IP:3000/api/hardware/events
Content-Type: application/json
```

```json
{
  "deviceId": "PILLBOX-DEMO-001",
  "slotId": 3,
  "eventType": "lid_open",
  "firmwareVersion": "esp32-s3-mvp-0.1.0"
}
```

Supported `eventType` values:

- `lid_open`
- `wrong_slot_open`
- `reminder_started`
- `reminder_stopped`

The dashboard records `lid_open` and `wrong_slot_open` as opening events. Reminder lifecycle events are accepted but not shown in the current dashboard table yet.

### Read Uploaded Events

```http
GET http://YOUR_LAPTOP_IP:3000/api/hardware/events
```

### Clear Uploaded Events

```http
DELETE http://YOUR_LAPTOP_IP:3000/api/hardware/events
```

The web app polls `/api/hardware/events` every 2.5 seconds and merges uploaded hardware opening events into the existing Pillbox Event Log. Demo data is stored in the Git-ignored `.data/hardware-demo.json` file so Next.js hot restarts do not immediately erase the demo. It is not a production database.

## Local ML Shadow Replay

Generate the synthetic dataset, models, policy, and compact replay bundle by
following `ml/README.md`. Then run the app in development and open:

```text
http://localhost:3000/hardware-simulator
```

Select **Run shadow replay**. The development-only
`POST /api/hardware/replay` endpoint injects the 14-day bundle through the same
payload validator and hardware event store used by the ESP32 endpoint. Before
running it, start the local model service in another terminal:

```bash
/tmp/smart-pillbox-ml-venv/bin/python ml/serve_adherence_model.py
```

The endpoint rebuilds pre-dose features from up to 28 days of earlier opening
events, calls the live local model for each dose, and then applies the saved
threshold, daily reminder budget, and cooldown. The simulator shows shadow-only
risk metrics and the model version, while Dashboard → Device activity shows the
replayed opening events.

In development, a normal `POST /api/hardware/events` also makes a best-effort
prediction for the next scheduled dose. That prediction is available from:

```http
GET /api/adherence/shadow?patientId=YOUR_DEVICE_ID
```

The replay and Shadow read endpoints return `404` outside
`NODE_ENV=development`. Model unavailability never rejects a hardware event.
None of these paths sends a reminder, updates production alert logic, or
exposes synthetic labels through the hardware event feed. Safety Control
remains a separate hard-rule path.

## Firmware Starter

Arduino sketch:

```txt
hardware/esp32-s3/smart_pillbox_demo/smart_pillbox_demo.ino
```

Before uploading:

1. Install Arduino IDE or PlatformIO.
2. Install ESP32 board support.
3. Select your ESP32-S3 board.
4. Copy `config.example.h` to `config.h`, then update `WIFI_SSID`, `WIFI_PASSWORD`, and `SERVER_BASE_URL`.
5. Verify GPIO pins against the exact board you bought.
6. Keep only Slot 1 enabled in `SLOT_ENABLED` for the first test.
7. Test one reed switch and one LED before wiring all eight slots.

## Wiring Strategy

Build in this order:

1. ESP32-S3 boots and prints to Serial Monitor.
2. ESP32-S3 connects to Wi-Fi.
3. One green LED turns on.
4. One active buzzer sounds.
5. One reed-switch module changes state when the magnet moves.
6. One slot uploads a `lid_open` event to the dashboard.
7. Duplicate the same circuit to 2 slots, then 4 slots, then 8 slots.
8. Add OLED after the core loop is stable.
9. Move from breadboard to perfboard after repeated tests pass.

Use wire colors consistently:

- Red: 3.3V or 5V
- Black: GND
- Other colors: sensor and LED signals

Do not hot-glue reed sensors permanently at the start. Use double-sided tape first, test the magnet distance, then glue after the signal is stable.

## Demo Flow

Recommended live demo:

1. In the web app, set Slot 3 as a high-risk medication.
2. Start the ESP32 demo firmware.
3. After 30 seconds, Slot 3 green LED turns on and buzzer starts.
4. Open Slot 3.
5. ESP32 POSTs a `lid_open` event.
6. Dashboard shows Slot 3 opening in Event Log and adherence status.
7. Optional: open Slot 5 during Slot 3 reminder to trigger `wrong_slot_open`.

Minimum success standard:

- ESP32 runs.
- One LED lights.
- Buzzer sounds.
- One reed switch detects lid open.
- Correct-slot opening stops reminder.
- ESP32 uploads an event to the web app.
- Dashboard shows the real opening record.

If there is not enough time for eight physical slots, build two or four real slots and keep the web UI showing eight slots. Explain that the remaining slots are repeated copies of the same sensor and LED unit.
