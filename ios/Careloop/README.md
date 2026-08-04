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

- Settings offers two persistent native experiences. `Circle Care` keeps the
  complete family-care workflow, while `My Care` uses larger text and a calmer
  self-management view. Switching modes does not change pillbox data or the
  medication plan.
- In `My Care`, the four native tabs become My Day, My Medicines, AI Insight
  and Settings. Caregiver-only patient switching, contact actions, review
  controls, detailed risk reports and care notes stay in `Circle Care`.
- Margaret reads live events, device state and medication plan from the
  existing hardware API.
- The caregiver profile can be edited from the fourth, native Settings tab.
  Changes are saved on the iPhone immediately and synced through
  `/api/profile`; the app automatically retries edits made while offline.
- The caregiver name, role and initials shown in the native Today and Settings
  views come from the shared profile rather than hard-coded UI text.
- David and Ellen remain static prototype profiles until additional devices
  are mapped by patient ID.
- The native app never creates fake opening events or labels sample data as
  hardware data.
- Care notes are stored locally on the iPhone with `UserDefaults`.
