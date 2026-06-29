# Smart Pillbox AI

Smart Pillbox AI is an AIoT medication safety dashboard prototype for elderly people, chronic disease patients, caregivers, and family members.

This demo simulates the software and hardware-signal flow of a smart pillbox system.

## Current Version

This version includes:

- Smart pillbox compartment simulator
- Simulated switch-sensor opening events
- Caregiver initialisation table
- Editable medication schedule
- High-risk medication flag
- Caregiver-defined buffer time
- Rule-based medication safety control
- Detection of:
  - Taken - On Time
  - Taken - Delayed
  - Opened Too Early
  - Missed / Very Late
  - Duplicate Risk
- Adherence overview dashboard
- Pillbox event log

## Project Layers

The current prototype separates the system into:

1. Hardware Simulation Demo Layer  
   Simulates pillbox opening events and switch-sensor signals.

2. Medication Safety Control Layer  
   Uses deterministic, rule-based logic to classify medication events.

3. Dashboard UI Layer  
   Displays pillbox status, caregiver initialisation, adherence overview, and event logs.

The AI Adherence Intelligence Layer will be added in the next development stage.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS

## Run Locally

```bash
npm install
npm run dev

Then open:
http://localhost:3000



## Development Status
Version 0.1:

Hardware simulation: completed
Rule-based safety control: completed
Dashboard UI: completed
AI adherence intelligence: planned