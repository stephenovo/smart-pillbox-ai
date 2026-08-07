# ESP32-S3 Smart Pillbox Firmware

Open `smart_pillbox_demo.ino` in Arduino IDE after completing the hardware setup guide:

```text
docs/HARDWARE_MVP_SETUP.md
```

Before compiling, duplicate `config.example.h` in this folder, rename the copy to
`config.h`, and enter the Wi-Fi name and password. The checked-in template is
already configured for the live account:

```cpp
#define SERVER_BASE_URL "https://smartpb.me"
#define DEVICE_ID "PILLBOX-20260808"
```

Pair the iPhone app with connect code `20260808`, then open
`https://smartpb.me/studio` to watch heartbeats, telemetry, and lid events from
the same device. `config.h` is ignored by Git so Wi-Fi credentials are not
committed.

## Live cloud demo

1. Add the Wi-Fi credentials to `config.h` and flash `smart_pillbox_demo.ino`.
2. Confirm the OLED/serial output reports Wi-Fi connected.
3. Open Studio and wait for **Physical device online**.
4. Open Slot 1 or Slot 2. The opening appears in Studio and in the paired iPhone
   app on its next refresh.
5. Change the medication plan in the app. The firmware and Studio read the same
   cloud-backed plan.

The connect code is intended for this hardware demonstration. It is not a
replacement for per-device authentication in a production care deployment.

Install these Arduino libraries through Library Manager:

- ArduinoJson (7.x)
- Adafruit GFX Library
- Adafruit SSD1306

`WiFi`, `HTTPClient`, and `Wire` are included with the ESP32 board package.

## Two-slot demo startup

With the Mac and ESP32 using the same phone hotspot, connect the ESP32 Type-C
data cable and run this command from the project root:

```bash
npm run demo:hardware
```

The script detects the Mac hotspot IP, updates only `SERVER_BASE_URL` in the
ignored `config.h`, compiles and uploads the Slot 1 and Slot 2 firmware, and
starts the local dashboard/API on port 3000. Keep the terminal open during the
demo.
