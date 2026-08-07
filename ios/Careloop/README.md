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

The app defaults to the production API at `https://smartpb.me` and device ID
`PILLBOX-DEMO-001`. Build 12 migrates the old `127.0.0.1:3100` default to the
production endpoint so TestFlight users can generate DeepSeek AI Insights
without changing Settings. Both values remain editable for local development.

Circle Care presents AI Insights and Notes as separate record sections. AI
output is labelled as generated observation, while Notes
remain explicitly human-written and are never generated or rewritten by AI.

## Run on a physical iPhone

Start Next.js on the Mac's network interface:

```sh
env -u NODE_OPTIONS npm run dev -- --hostname 0.0.0.0 --port 3100
```

Then enter `http://<mac-lan-ip>:3100` in the app's Settings tab. The iPhone and
Mac must be on the same network. Restore `https://smartpb.me` after local
testing to use the production DeepSeek API route.

## DeepSeek AI Insights

The iOS app calls `POST https://smartpb.me/api/caregiver-insight`; it never
receives or stores the DeepSeek credential. Configure `DEEPSEEK_API_KEY` as a
server-side Cloudflare secret and use `DEEPSEEK_MODEL=deepseek-v4-flash`.
The model receives a deterministic activity report and may describe recorded
opening and timing patterns only. It cannot confirm ingestion, diagnose, or
recommend medication, dose, or schedule changes.

## Data behavior

- Settings presents `Circle Care` and `My Care` as two independent native
  experiences. Switching requires a confirmation and short transition, while
  pillbox data and the medication plan remain shared.
- In `My Care`, the four native tabs become My Day, My Medicines, AI Check-in
  and Settings. Caregiver-only patient switching, contact actions, review
  controls, detailed risk reports and the care journal stay in `Circle Care`.
- A new pillbox setup finishes with a three-step guidebook tailored to the
  active care mode.
- Each pillbox owner can use one of 12 original warm family portraits or a
  photo selected from the iPhone. Six portraits feature older adults, with
  adult and child options also included. Photos are cropped, compressed and stored
  locally without being uploaded by the app; both care modes show the same saved avatar. See
  [AVATAR_ASSET_LICENSES.md](AVATAR_ASSET_LICENSES.md) for source details.
- Pillbox setup can remove a connected device and its local medication routine
  while keeping the person's profile, avatar and Care Journal entries.
- Circle Care's `Caregiver AI` combines bounded AI observations of opening and
  timing patterns, a clinic handoff summary, and a human-written care journal.
  It does not confirm ingestion, diagnose, recommend actions, or change medication instructions.
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
- Care journal entries are stored locally on the iPhone with `UserDefaults`.
