"use client";

import { useMemo, useState } from "react";

import { AdherenceOverview } from "../src/components/AdherenceOverview";
import { CareSessionControl } from "../src/components/CareSessionControl";
import { EventLog } from "../src/components/EventLog";
import { InitialisationTable } from "../src/components/InitialisationTable";
import { PillboxSimulator } from "../src/components/PillboxSimulator";
import { Sidebar } from "../src/components/Sidebar";

import {
  clearOpeningEvents,
  createOpeningEvent,
} from "../src/lib/hardwareSimulation";

import { getRecommendedBufferTime } from "../src/lib/scheduleDefaults";

import {
  calculateDashboardKpis,
  generateRecordedMedicationStatuses,
} from "../src/lib/safetyControl";

import { initialMedicationSchedule } from "../src/lib/sampleData";

import type { MedicationSchedule, OpeningEvent } from "../src/types/pillbox";

export default function Home() {
  const [medicationSchedule, setMedicationSchedule] =
    useState<MedicationSchedule[]>(initialMedicationSchedule);

  const [openingEvents, setOpeningEvents] = useState<OpeningEvent[]>([]);

  const [analysisDate, setAnalysisDate] = useState("2026-06-26");
  const [analysisTime, setAnalysisTime] = useState("08:10");

  const activeMedicationSchedule = useMemo(
    () => medicationSchedule.filter((item) => item.medication.trim() !== ""),
    [medicationSchedule]
  );

  const currentSimulatedTime = `${analysisDate} ${analysisTime}`;

  const medicationStatuses = useMemo(
    () =>
      generateRecordedMedicationStatuses(
        activeMedicationSchedule,
        openingEvents,
        analysisDate
      ),
    [activeMedicationSchedule, openingEvents, analysisDate]
  );

  const dashboardKpis = useMemo(
    () => calculateDashboardKpis(medicationStatuses),
    [medicationStatuses]
  );

  function handleOpenCompartment(item: MedicationSchedule) {
    const newEvent = createOpeningEvent(item, currentSimulatedTime);

    setOpeningEvents((currentEvents) => [newEvent, ...currentEvents]);
  }

  function handleClearEvents() {
    setOpeningEvents(clearOpeningEvents());
  }

  function handleApplyRecommendedBufferTimes() {
    setMedicationSchedule((currentSchedule) =>
      currentSchedule.map((item) => ({
        ...item,
        bufferTimeMinutes: getRecommendedBufferTime(item.highRisk),
      }))
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="flex-1 p-8">
          <header>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Smart Pillbox AI
            </h1>

            <p className="mt-2 text-slate-500">
              AIoT medication safety dashboard for caregivers, families, and
              elderly users.
            </p>
          </header>

          <CareSessionControl
            analysisDate={analysisDate}
            analysisTime={analysisTime}
            onAnalysisDateChange={setAnalysisDate}
            onAnalysisTimeChange={setAnalysisTime}
          />

          <PillboxSimulator
            schedule={activeMedicationSchedule}
            events={openingEvents}
            statuses={medicationStatuses}
            currentSimulatedTime={currentSimulatedTime}
            onOpenCompartment={handleOpenCompartment}
            onClearEvents={handleClearEvents}
          />

          <InitialisationTable
            schedule={medicationSchedule}
            onScheduleChange={setMedicationSchedule}
            onApplyRecommendedBufferTimes={handleApplyRecommendedBufferTimes}
          />

          <AdherenceOverview
            kpis={dashboardKpis}
            statuses={medicationStatuses}
          />

          <EventLog events={openingEvents} />
        </section>
      </div>
    </main>
  );
}