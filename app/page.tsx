"use client";

import { useMemo, useState } from "react";

import { CareSessionControl } from "../src/components/CareSessionControl";
import InitialisationSetupPanel from "../src/components/InitialisationSetupPanel";
import MainSectionTabs, {
  type MainSectionTab,
} from "../src/components/MainSectionTabs";
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

import DashboardPanel from "../src/components/DashboardPanel";

export default function Home() {
  const [activeTab, setActiveTab] =
    useState<MainSectionTab>("initialisation");

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

  function handleImportDemoDatabase() {
    const demoDate = "2026-06-26";

    const demoEventSpecs = [
      {
        compartmentId: 3,
        openedAt: `${demoDate} 19:38`,
      },
      {
        compartmentId: 2,
        openedAt: `${demoDate} 09:22`,
      },
      {
        compartmentId: 1,
        openedAt: `${demoDate} 08:18`,
      },
      {
        compartmentId: 1,
        openedAt: `${demoDate} 08:06`,
      },
    ];

    const importedEvents = demoEventSpecs
      .map((spec) => {
        const scheduleItem = activeMedicationSchedule.find(
          (item) => item.compartment === spec.compartmentId
        );

        if (!scheduleItem) {
          return null;
        }

        return createOpeningEvent(scheduleItem, spec.openedAt);
      })
      .filter((event): event is OpeningEvent => event !== null);

    setAnalysisDate(demoDate);
    setAnalysisTime("20:30");
    setOpeningEvents(importedEvents);
    setActiveTab("dashboard");
  }

      return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
          <div className="flex min-h-screen">
            <Sidebar />

            <section className="flex-1 p-8">
          <div className="space-y-6">
            <header>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">
                Smart Pillbox AI
              </h1>

              <p className="mt-3 text-lg font-normal text-slate-500">
                AIoT medication safety dashboard for caregivers, families, and
                elderly users.
              </p>
            </header>

            <MainSectionTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {activeTab === "initialisation" && (
              <InitialisationSetupPanel
                schedule={medicationSchedule}
                onScheduleChange={setMedicationSchedule}
                onApplyRecommendedBufferTimes={handleApplyRecommendedBufferTimes}
              />
            )}

            {activeTab === "pillbox" && (
              <div className="space-y-6">
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

                <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
                        Demo Control
                      </p>

                      <h2 className="mt-1 text-2xl font-bold text-slate-900">
                        Import Prepared Demo Data
                      </h2>

                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                        This button is only for the IFF2026 demo. It imports
                        prepared opening-event records so the Dashboard can
                        immediately show adherence status, duplicate opening risk,
                        and AI caregiver insights.
                      </p>
                    </div>

                    <button
                      onClick={handleImportDemoDatabase}
                      className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                    >
                      Import Demo Database
                    </button>
                  </div>

                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    <strong>Demo note:</strong> This is not part of the final
                    user-facing product. It is a demo shortcut for loading
                    prepared pillbox opening records into the Dashboard.
                  </div>
                </section>
              </div>
            )}

            {activeTab === "dashboard" && (
              <DashboardPanel
                kpis={dashboardKpis}
                statuses={medicationStatuses}
                events={openingEvents}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}