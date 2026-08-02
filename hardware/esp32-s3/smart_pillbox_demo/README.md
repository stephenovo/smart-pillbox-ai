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
