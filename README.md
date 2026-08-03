# Smart Pillbox AI Web

This repository contains the caregiver clients and hardware demo for **Smart Pillbox AI**.

The web app is built with **Next.js, React, TypeScript, and Tailwind CSS**.
It includes medication initialisation, caregiver monitoring, a separate pillbox hardware simulator, rule-based medication safety control, self-learning reminder escalation, and DeepSeek-powered caregiver insight reports.

## Product Surfaces

The caregiver products and the hardware simulator are separate experiences:

| Surface | Entry point | Role |
| --- | --- | --- |
| Caregiver desktop web | `http://localhost:3000` | Desktop monitoring and care management |
| Caregiver mobile web | `http://localhost:3000/mobile` | Phone-sized caregiver experience |
| Caregiver iOS app | `ios/Careloop` | Native caregiver app |
| Pillbox hardware simulator | `http://localhost:3000/hardware-simulator` | Simulates the physical device, lid openings, reminders, and event uploads |

The three caregiver clients consume device data. The hardware simulator produces
that data through the same `/api/hardware/*` endpoints used by the ESP32 demo.

---

## How to Run

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm run dev
```

Then open:

```txt
http://localhost:3000
```

Mobile caregiver view:

```txt
http://localhost:3000/mobile
```

Pillbox hardware simulator:

```txt
http://localhost:3000/hardware-simulator
```

---

## How to Use the Web Demo

The main caregiver web app is divided into monitoring and care-management tabs,
including:

```txt
Care feed → Medication plan → Device activity → Care messages → Settings
```

---

### 1. Initialisation

This page is used to set up the medication plan.

Users can configure:

* medication name
* pillbox compartment
* scheduled reminder time
* buffer time
* high-risk medication flag

The page also includes a short onboarding tutorial for first-time users.

After editing the medication plan, click:

```txt
Save Initialisation
```

The setup status will change between:

```txt
Unsaved changes
Saved
```

---

### 2. Device Activity

This page is part of the caregiver experience. It monitors the physical or
simulated pillbox and can send a reminder to the device. It does not simulate
opening a lid.

It can:

* display timestamped opening events
* show connection and reminder state
* send or stop a compartment reminder
* review activity by date

---

### 3. Dashboard

This page displays the caregiver monitoring interface.

It includes four main sections:

1. Emergency reminder banner
   Appears only when urgent medication patterns are detected.

2. Weekly medication status matrix
   Shows morning, noon, and evening adherence status using:

   * green dots = normal
   * yellow dots = late
   * red dots = missed

3. Adherence Overview + Pillbox Event Log
   Shows KPI cards, rule-based adherence status, and raw opening events.

4. AI Intelligent Data Report
   Generates:

   * Overall Summary
   * Insight
   * Clinic-Visit Note

Each AI report section can be generated separately to reduce API usage.

---

## Development Test Pages

The project includes several test pages for checking AI and API logic.

### DeepSeek API Test

```txt
http://localhost:3000/ai-api-test
```

Tests whether the DeepSeek caregiver insight API route works.

---

### AI Engine Test

```txt
http://localhost:3000/ai-engine-test
```

Tests the full AI pipeline:

* self-learning reminder escalation
* caregiver insight report
* DeepSeek-generated summary

---

### AI Learning Test

```txt
http://localhost:3000/ai-learning-test
```

Demonstrates how the AI model updates when new adherence records are added.

This page is useful for showing that the AI is self-learning rather than fixed rule-only logic.

---

## Hardware MVP Prep

The project now includes starter materials for the ESP32-S3 pillbox hardware demo.

```txt
docs/hardware/README.md
docs/hardware/MVP_CHECKLIST.md
docs/HARDWARE_MVP_SETUP.md
hardware/esp32-s3/smart_pillbox_demo/smart_pillbox_demo.ino
```

Prepared web endpoints:

```txt
GET    /api/hardware/plan
POST   /api/hardware/plan
GET    /api/hardware/events
POST   /api/hardware/events
DELETE /api/hardware/events
GET    /api/hardware/state
POST   /api/hardware/state
```

The caregiver clients poll uploaded hardware opening events. The independent
hardware simulator at `/hardware-simulator` sends those events through the same
API as the ESP32 firmware.

---

## Mobile View

The project includes a phone-first caregiver view:

```txt
http://localhost:3000/mobile
```

It includes:

* Today overview
* slot control
* hardware event polling
* mobile event timeline
* AI caregiver insight summary

The web manifest starts at `/mobile`, so the page can be tested as a lightweight mobile web app.

---

## File Structure

```txt
app/
  page.tsx
  layout.tsx
  globals.css

  api/
    caregiver-insight/
      route.ts

  ai-api-test/
    page.tsx

  ai-engine-test/
    page.tsx

  ai-learning-test/
    page.tsx

src/
  components/
    Sidebar.tsx
    MainSectionTabs.tsx
    InitialisationSetupPanel.tsx
    InitialisationTable.tsx
    CareSessionControl.tsx
    PillboxSimulator.tsx
    DashboardPanel.tsx
    AdherenceOverview.tsx
    EventLog.tsx
    AiFeaturePanel.tsx
    AiReportPanel.tsx

  lib/
    hardwareSimulation.ts
    safetyControl.ts
    scheduleDefaults.ts
    sampleData.ts
    sampleHistory.ts
    aiAdherence.ts
    aiCaregiverInsights.ts
    aiEngine.ts

  types/
    pillbox.ts
```

---

## Main App Files

### `app/page.tsx`

Main application page.

Responsibilities:

* stores main React state
* manages active tab selection
* stores medication schedule
* stores pillbox opening events
* connects Initialisation, Pillbox, and Dashboard pages
* handles demo database import
* passes data into dashboard components

---

### `app/layout.tsx`

Root layout for the Next.js app.

Responsibilities:

* defines the HTML shell
* applies global metadata
* loads global CSS

---

### `app/globals.css`

Global CSS file.

Responsibilities:

* imports Tailwind CSS
* defines global styles
* sets base body styling and font family

---

## API Route

### `app/api/caregiver-insight/route.ts`

Server-side API route for generating AI caregiver reports with DeepSeek.

Responsibilities:

* reads `DEEPSEEK_API_KEY` from `.env.local`
* receives structured caregiver insight reports from the frontend
* sends prompts to the DeepSeek API
* returns generated AI text to the dashboard
* supports separate report sections:

  * caregiver summary
  * key insight
  * clinic-visit note

Important:

* API keys are only used server-side
* no API key is exposed to the browser
* do not use `NEXT_PUBLIC_` for the DeepSeek key

---

## Component Files

### `src/components/Sidebar.tsx`

Left sidebar component.

Responsibilities:

* displays project branding
* shows app status / sidebar information
* provides consistent layout identity

---

### `src/components/MainSectionTabs.tsx`

Top navigation tabs.

Responsibilities:

* switches between:

  * Initialisation
  * Pillbox
  * Dashboard
* keeps the main interface separated into clear user flows

---

### `src/components/InitialisationSetupPanel.tsx`

Outer wrapper for the Initialisation page.

Responsibilities:

* displays the setup page header
* shows configured medication count
* provides first-time onboarding tutorial
* wraps the medication setup table

---

### `src/components/InitialisationTable.tsx`

Medication setup editor.

Responsibilities:

* displays each pillbox compartment as an editable card
* allows editing medication name
* allows editing scheduled time
* allows editing buffer time
* allows toggling high-risk medication
* tracks saved / unsaved setup state
* provides:

  * Apply Recommended Buffer Times
  * Save Initialisation

---

### `src/components/CareSessionControl.tsx`

Demo session control panel.

Responsibilities:

* controls analysis date
* controls analysis time
* provides the simulated current time for pillbox opening events

---

### `src/components/PillboxSimulator.tsx`

Local hardware simulation UI.

Responsibilities:

* displays pillbox compartments
* simulates opening a compartment
* creates opening events
* shows compartment status
* clears opening records

This component represents the demo hardware layer before ESP32 integration.

---

### `src/components/DashboardPanel.tsx`

Main dashboard page component.

Responsibilities:

* displays emergency reminder banner
* displays weekly medication status matrix
* groups Adherence Overview and Event Log
* displays AI Intelligent Data Report
* organizes the dashboard into four major sections

---

### `src/components/AdherenceOverview.tsx`

Rule-based adherence overview.

Responsibilities:

* displays dashboard KPI cards
* shows rule-based medication status
* displays status such as:

  * Taken - On Time
  * Taken - Delayed
  * Missed / Very Late
  * Duplicate Risk
  * Pending

---

### `src/components/EventLog.tsx`

Pillbox opening event log.

Responsibilities:

* displays recorded opening events
* shows timestamped pillbox activity
* provides evidence for dashboard status calculation

---

### `src/components/AiFeaturePanel.tsx`

Earlier AI feature panel component.

Responsibilities:

* displays self-learning reminder escalation results
* displays caregiver insight summary
* can call the caregiver insight API

This component is kept for development and reference.

---

### `src/components/AiReportPanel.tsx`

Current AI report panel used in the Dashboard.

Responsibilities:

* displays AI Intelligent Data Report
* generates report sections separately:

  * Overall Summary
  * Insight
  * Clinic-Visit Note
* calls `/api/caregiver-insight`
* displays medication concern heatmap

---

## Logic Files

### `src/lib/hardwareSimulation.ts`

Hardware simulation logic.

Responsibilities:

* creates simulated pillbox opening events
* clears opening events
* provides helper logic for the local demo layer

---

### `src/lib/safetyControl.ts`

Rule-based medication safety control logic.

Responsibilities:

* compares medication schedules with opening events
* classifies adherence status
* detects duplicate opening risk
* calculates dashboard KPI values

This file contains deterministic safety logic and is not AI.

---

### `src/lib/scheduleDefaults.ts`

Default schedule helper logic.

Responsibilities:

* provides recommended buffer times
* applies different default buffer values for normal-risk and high-risk medications

---

### `src/lib/sampleData.ts`

Default medication schedule data.

Responsibilities:

* provides the initial pillbox medication schedule
* populates the Initialisation page when the app starts

---

### `src/lib/sampleHistory.ts`

Simulated historical adherence data.

Responsibilities:

* provides historical medication behaviour records
* supports self-learning AI testing
* supports AI caregiver insight generation
* includes examples of delayed, missed, and duplicate opening patterns

---

### `src/lib/aiAdherence.ts`

Self-learning reminder escalation AI logic.

Responsibilities:

* calculates delay profile
* calculates average delay
* calculates median delay
* calculates standard deviation
* detects recent adherence trend
* compares long-term and recent behaviour
* calculates adaptive escalation threshold
* generates AI reminder recommendation

The AI recommendation can output:

* Continue local reminder
* Second reminder recommended
* Caregiver alert recommended
* High-risk escalation recommended
* Insufficient history

---

### `src/lib/aiCaregiverInsights.ts`

Caregiver insight report logic.

Responsibilities:

* analyzes historical adherence records
* counts delayed, missed, and duplicate opening events
* identifies high-risk concerns
* calculates medication concern level
* generates structured caregiver insight report
* builds prompts for the DeepSeek API

---

### `src/lib/aiEngine.ts`

Unified AI engine.

Responsibilities:

* connects self-learning reminder escalation logic
* connects caregiver insight report logic
* provides a single function for running the AI pipeline

Main function:

```ts
runSmartPillboxAiEngine(...)
```

---

## Type Definitions

### `src/types/pillbox.ts`

Shared TypeScript types.

Responsibilities:

* defines medication schedule data structure
* defines pillbox opening event structure
* defines medication status types used across the app

---

## Demo Data Flow

```txt
Initialisation
  ↓
Medication schedule saved
  ↓
Pillbox simulator creates opening events
  ↓
Rule-based safety control classifies status
  ↓
Dashboard displays KPI cards and event log
  ↓
AI engine analyses adherence behaviour
  ↓
DeepSeek API generates caregiver-friendly report
```

---

## Environment Variables

Required for AI report generation:

```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_MODEL=deepseek-v4-flash
```

If these variables are missing, the web app can still run, but AI report generation will fail.

---

## Useful Commands

Run development server:

```bash
npm run dev
```

Build production version:

```bash
npm run build
```

Run production build:

```bash
npm start
```

Check Git status:

```bash
git status
```

Commit changes:

```bash
git add .
git commit -m "your commit message"
```

Push to GitHub:

```bash
git push origin main
```

---

## Notes for Developers

* Keep API keys in `.env.local`.
* Do not commit `.env.local`.
* Do not expose DeepSeek API keys in client-side components.
* Safety-critical medication classification should remain in `safetyControl.ts`.
* AI logic should not decide schedule, dosage, prescription, or clinical safety.
* Dashboard UI should read from structured logic outputs rather than duplicating business logic inside components.
