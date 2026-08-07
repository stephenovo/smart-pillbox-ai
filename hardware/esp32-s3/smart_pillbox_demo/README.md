# ESP32-S3 Smart Pillbox Firmware

Open `smart_pillbox_demo.ino` in Arduino IDE after completing the hardware setup guide:

```text
docs/HARDWARE_MVP_SETUP.md
```

Before compiling, duplicate `config.example.h` in this folder, rename the copy to
`config.h`, and enter the Wi-Fi name, password, and laptop LAN URL. `config.h` is
ignored by Git so credentials are not committed.

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
