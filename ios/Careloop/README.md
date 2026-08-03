# Careloop for iPhone

This folder contains a standalone native SwiftUI app. It does not replace or
embed the existing Next.js `/mobile` route.

## Requirements

- Xcode 16 or newer
- iOS 17 or newer
- The Careloop Next.js server for live hardware data

## Run in the iOS Simulator

1. Start the web/API server from the repository root:

   ```sh
   env -u NODE_OPTIONS npm run dev -- --hostname 127.0.0.1 --port 3100
   ```

2. Open `ios/Careloop/Careloop.xcodeproj` in Xcode.
3. Select an iPhone simulator and run the `Careloop` scheme.

The app defaults to `http://127.0.0.1:3100` and device ID
`PILLBOX-DEMO-001`. Both values can be changed in the native Settings tab.

## Run on a physical iPhone

Start Next.js on the Mac's network interface:

```sh
env -u NODE_OPTIONS npm run dev -- --hostname 0.0.0.0 --port 3100
```

Then enter `http://<mac-lan-ip>:3100` in the app's Settings tab. The iPhone and
Mac must be on the same network. Use an HTTPS API endpoint for production.

## Data behavior

- Margaret reads live events, device state and medication plan from the
  existing hardware API.
- David and Ellen remain static prototype profiles until additional devices
  are mapped by patient ID.
- The native app never creates fake opening events or labels sample data as
  hardware data.
- Care notes are stored locally on the iPhone with `UserDefaults`.
