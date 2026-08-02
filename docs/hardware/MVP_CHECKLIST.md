# Hardware MVP Checklist

Use this checklist after buying the parts.

## Day 1: Board And Network

- [ ] ESP32-S3 board powers on.
- [ ] Type-C cable can upload firmware, not charge-only.
- [ ] Serial Monitor works at 115200 baud.
- [ ] ESP32-S3 connects to Wi-Fi.
- [ ] Laptop and ESP32 are on the same Wi-Fi network.
- [ ] Web app runs with `npm run dev -- -H 0.0.0.0 -p 3000`.
- [ ] ESP32 can POST to `http://LAPTOP_IP:3000/api/hardware/events`.

## Day 2: One-Slot Circuit

- [ ] One green LED lights from ESP32 GPIO.
- [ ] LED has a 220 ohm or 330 ohm resistor.
- [ ] Active buzzer module sounds.
- [ ] One reed-switch module changes digital state.
- [ ] Magnet distance is stable when the lid is closed.
- [ ] Opening the lid prints the slot number in Serial Monitor.
- [ ] Opening the lid uploads a dashboard event.

## Day 3: Medication Reminder Loop

- [ ] Demo reminder starts after 30 seconds.
- [ ] Target slot LED turns on.
- [ ] Buzzer turns on.
- [ ] Opening the correct slot turns LED and buzzer off.
- [ ] Web Event Log shows the opening.
- [ ] Dashboard can classify the event.

## Day 4: Multi-Slot Expansion

- [ ] Two slots work independently.
- [ ] Four slots work independently.
- [ ] Eight slots are wired or clearly prepared for expansion.
- [ ] Wrong-slot opening can be detected.
- [ ] Wires are labelled by slot number.

## Day 5: Presentation Stability

- [ ] One spare ESP32-S3 is flashed and ready.
- [ ] One spare Type-C data cable is packed.
- [ ] USB power adapter is packed.
- [ ] Demo can run without relying on laptop USB power.
- [ ] Double-sided tape positions are stable.
- [ ] Hot glue is used only after sensor alignment is confirmed.
- [ ] Dashboard is tested with real hardware events.
- [ ] Fallback demo data still works if Wi-Fi fails.

## Do Not Add Yet

- [ ] Battery power
- [ ] Charging board
- [ ] Boost converter
- [ ] Servo lock
- [ ] Camera
- [ ] Microphone
- [ ] Weight sensor
- [ ] Custom PCB
- [ ] Touchscreen

These are intentionally out of scope for the first MVP because they increase debugging risk more than demo value.
