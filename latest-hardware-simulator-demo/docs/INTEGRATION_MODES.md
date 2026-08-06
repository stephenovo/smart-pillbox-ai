# Pillbox Integration Modes

The software uses one event contract with three selectable input modes. The
default is deliberately disconnected so the website and algorithms can be
submitted or demonstrated without depending on external hardware.

| Mode | Input | Device ID | Behaviour |
|---|---|---|---|
| `standalone` | Prepared software data | None | Default. No simulator or ESP32 events are consumed. |
| `simulator` | Browser pillbox simulator | `PILLBOX-SIMULATOR-001` | Simulator events feed the safety layer, caregiver dashboard, mobile view, and AI report adapter. |
| `hardware` | ESP32-S3 | `PILLBOX-DEMO-001` | Physical lid events feed the same software pipeline. |

The simulator and ESP32 can continue writing to their own event streams while
disconnected. Selecting a mode changes which stream the software consumes; it
does not change the safety or AI algorithm implementation.

```text
Simulator ---------> PILLBOX-SIMULATOR-001 --+
                                              +--> selected input --> software
ESP32 -------------> PILLBOX-DEMO-001 -------+
```

The active mode is stored locally in `.data/hardware-demo.json`. A new store
starts in `standalone`. It can be changed from the connection-source control in
the caregiver dashboard or mobile view, or with:

```bash
curl -X POST http://localhost:3000/api/integration/mode \
  -H 'Content-Type: application/json' \
  -d '{"mode":"simulator"}'
```

Return to the disconnected state with:

```bash
curl -X POST http://localhost:3000/api/integration/mode \
  -H 'Content-Type: application/json' \
  -d '{"mode":"standalone"}'
```

Simulator event payloads include `source: "simulation"`. ESP32 payloads omit
`source`, which defaults to `hardware` for firmware compatibility.

## Wrong-time demo

The simulator uses the computer's live local time for every opening. The user
only changes `Planned time`; the dashboard polls that source plan and classifies
the retained event against its latest planned time.

For example, if the live time is `14:00`, set Slot 1 to `14:00`, open it, and
then change its planned time to `16:00`. The retained opening is reclassified as
`Opened Too Early`; the simulator flashes a full-page red warning for three
seconds, sounds the warning buzzer, and keeps the warning in the caregiver
timeline after the flash ends.
