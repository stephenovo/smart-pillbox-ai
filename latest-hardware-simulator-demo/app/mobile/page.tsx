"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ChartNoAxesColumn, LayoutGrid, Phone, Plus } from "lucide-react";

import { ConnectedDemoBar } from "../../src/components/ConnectedDemoBar";
import { useIntegrationMode } from "../../src/hooks/useIntegrationMode";
import { openingEventsToHistoricalRecords } from "../../src/lib/adherenceRecordAdapter";
import { hardwarePlanToMedicationSchedule } from "../../src/lib/integrationMode";
import { generateCaregiverInsightReport } from "../../src/lib/aiCaregiverInsights";
import {
  calculateDashboardKpis,
  generateRecordedMedicationStatuses,
} from "../../src/lib/safetyControl";
import { initialMedicationSchedule } from "../../src/lib/sampleData";
import { sampleHistoricalAdherenceRecords } from "../../src/lib/sampleHistory";
import type {
  HardwareEventsApiResponse,
  HardwarePlanApiResponse,
} from "../../src/types/hardware";
import type {
  DailyMedicationStatus,
  MedicationSchedule,
  OpeningEvent,
} from "../../src/types/pillbox";

type MobileTab = "today" | "slots" | "insights";

const tabs: { id: MobileTab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "today", label: "Today", icon: LayoutGrid },
  { id: "slots", label: "Meds", icon: Activity },
  { id: "insights", label: "Insights", icon: ChartNoAxesColumn },
];

function mergeOpeningEvents(
  currentEvents: OpeningEvent[],
  incomingEvents: OpeningEvent[]
): OpeningEvent[] {
  const currentEventIds = new Set(currentEvents.map((event) => event.id));
  const newEvents = incomingEvents.filter(
    (event) => !currentEventIds.has(event.id)
  );

  if (newEvents.length === 0) {
    return currentEvents;
  }

  return [...newEvents, ...currentEvents];
}

function getStatusTone(status: string): string {
  if (
    status === "Missed / Very Late" ||
    status === "Opened Too Early" ||
    status === "Duplicate Risk"
  ) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (status === "Taken - Delayed") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === "Taken - On Time") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-slate-200 bg-white text-slate-700";
}

function getStatusDot(status: string): string {
  if (
    status === "Missed / Very Late" ||
    status === "Opened Too Early" ||
    status === "Duplicate Risk"
  ) {
    return "bg-red-500";
  }

  if (status === "Taken - Delayed") {
    return "bg-amber-400";
  }

  if (status === "Taken - On Time") {
    return "bg-emerald-500";
  }

  return "bg-slate-300";
}

function getMedicationStatus(
  item: MedicationSchedule,
  statuses: DailyMedicationStatus[],
  events: OpeningEvent[]
): string {
  const currentStatus = statuses.find(
    (status) => status.compartment === item.compartment
  );
  const hasOpening = events.some((event) => event.compartment === item.compartment);

  return currentStatus?.status ?? (hasOpening ? "Opening recorded" : "Ready");
}

function createMobileCaregiverEvents(schedule: MedicationSchedule[]): OpeningEvent[] {
  const demoDate = "2026-06-26";
  const specs = [
    { id: "mobile-demo-heart", compartmentId: 4, openedAt: `${demoDate} 20:46` },
    { id: "mobile-demo-diabetes", compartmentId: 2, openedAt: `${demoDate} 09:22` },
    { id: "mobile-demo-bp-repeat", compartmentId: 1, openedAt: `${demoDate} 08:18` },
    { id: "mobile-demo-bp", compartmentId: 1, openedAt: `${demoDate} 08:06` },
  ];

  return specs
    .map((spec): OpeningEvent | null => {
      const item = schedule.find(
        (scheduleItem) => scheduleItem.compartment === spec.compartmentId
      );

      if (!item) {
        return null;
      }

      return {
        id: spec.id,
        eventTime: spec.openedAt,
        receivedAt: new Date(
          spec.openedAt.replace(" ", "T") + ":00"
        ).toISOString(),
        compartment: item.compartment,
        medication: item.medication,
        eventType: "lid_open",
        source: "simulation",
        deviceId: "SOFTWARE-SIMULATOR",
        activeSlotAtEvent: item.compartment,
      };
    })
    .filter((event): event is OpeningEvent => event !== null);
}

export default function MobilePage() {
  const integration = useIntegrationMode();
  const [activeTab, setActiveTab] = useState<MobileTab>("today");
  const [standaloneMedicationSchedule] = useState<MedicationSchedule[]>(
    initialMedicationSchedule
  );
  const [sourcePlan, setSourcePlan] = useState<{
    deviceId: string;
    schedule: MedicationSchedule[];
  } | null>(null);
  const [openingEvents] = useState<OpeningEvent[]>(() =>
    createMobileCaregiverEvents(initialMedicationSchedule)
  );
  const [sourceOpeningEvents, setSourceOpeningEvents] = useState<OpeningEvent[]>([]);
  const [analysisDate, setAnalysisDate] = useState("2026-06-26");
  const latestSourceEventId = useRef<string | null>(null);

  useEffect(() => {
    latestSourceEventId.current = null;

    if (!integration.activeDeviceId) return;
    const selectedDeviceId = integration.activeDeviceId;

    let isActive = true;

    async function syncSourceOpeningEvents() {
      try {
        const [eventsResponse, planResponse] = await Promise.all([
          fetch(
            `/api/hardware/events?deviceId=${encodeURIComponent(
              selectedDeviceId
            )}`,
            { cache: "no-store" }
          ),
          fetch(
            `/api/hardware/plan?deviceId=${encodeURIComponent(
              selectedDeviceId
            )}`,
            { cache: "no-store" }
          ),
        ]);

        if (!eventsResponse.ok || !planResponse.ok) {
          return;
        }

        const data = (await eventsResponse.json()) as HardwareEventsApiResponse;
        const planData = (await planResponse.json()) as HardwarePlanApiResponse;

        if (!isActive) {
          return;
        }

        setSourceOpeningEvents(data.events);
        setSourcePlan({
          deviceId: selectedDeviceId,
          schedule: hardwarePlanToMedicationSchedule(planData.slots),
        });

        const latestEvent = data.events[0];
        if (latestEvent && latestEvent.id !== latestSourceEventId.current) {
          latestSourceEventId.current = latestEvent.id;
          setAnalysisDate(latestEvent.eventTime.slice(0, 10));
        }
      } catch {
        // The mobile demo keeps its standalone snapshot if the source is offline.
      }
    }

    syncSourceOpeningEvents();
    const intervalId = window.setInterval(syncSourceOpeningEvents, 2500);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [integration.activeDeviceId]);

  const medicationSchedule =
    integration.activeDeviceId &&
    sourcePlan?.deviceId === integration.activeDeviceId
      ? sourcePlan.schedule
      : standaloneMedicationSchedule;

  const activeMedicationSchedule = useMemo(
    () => medicationSchedule.filter((item) => item.medication.trim() !== ""),
    [medicationSchedule]
  );

  const visibleOpeningEvents = useMemo(
    () =>
      integration.activeDeviceId
        ? mergeOpeningEvents(
            openingEvents,
            sourceOpeningEvents.filter(
              (event) => event.deviceId === integration.activeDeviceId
            )
          )
        : openingEvents,
    [integration.activeDeviceId, openingEvents, sourceOpeningEvents]
  );

  const medicationStatuses = useMemo(
    () =>
      generateRecordedMedicationStatuses(
        activeMedicationSchedule,
        visibleOpeningEvents,
        analysisDate
      ),
    [activeMedicationSchedule, visibleOpeningEvents, analysisDate]
  );

  const dashboardKpis = useMemo(
    () => calculateDashboardKpis(medicationStatuses),
    [medicationStatuses]
  );

  const report = useMemo(() => {
    const connectedRecords = openingEventsToHistoricalRecords(
      visibleOpeningEvents,
      activeMedicationSchedule,
      "patient-001"
    );
    return generateCaregiverInsightReport(
      [...sampleHistoricalAdherenceRecords, ...connectedRecords],
      "patient-001"
    );
  }, [activeMedicationSchedule, visibleOpeningEvents]);

  const nextMedication = activeMedicationSchedule[0];
  const riskCount = medicationStatuses.filter(
    (item) =>
      item.status === "Missed / Very Late" ||
      item.status === "Opened Too Early" ||
      item.status === "Duplicate Risk"
  ).length;

  return (
    <main className="min-h-dvh bg-stone-100 text-neutral-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[#fafafa] shadow-xl">
        <header className="border-b border-stone-200 bg-white px-5 pb-5 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffe1df] text-sm font-bold text-rose-800 ring-2 ring-[#ff5c5c] ring-offset-2 ring-offset-white">
                ML
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-400">Today&apos;s care</p>
                <h1 className="mt-0.5 text-xl font-bold text-neutral-950">Margaret Lin</h1>
              </div>
            </div>

            <div className="rounded-full bg-[#effaf7] px-3 py-1 text-xs font-bold text-teal-700">
              Online
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {dashboardKpis.slice(0, 3).map((item) => (
              <div
                key={item.label}
                className="border-l border-stone-200 pl-3 first:border-0 first:pl-0"
              >
                <p className="text-[11px] text-neutral-400">{item.label}</p>
                <p className="mt-1 text-xl font-bold text-neutral-950">{item.value}</p>
              </div>
            ))}
          </div>
        </header>

        <ConnectedDemoBar
          activeSurface="mobile"
          compact
          mode={integration.mode}
          activeDeviceId={integration.activeDeviceId}
          isChangingMode={integration.isChangingMode}
          onModeChange={integration.setMode}
        />

        <section className="flex-1 bg-[#fafafa] px-4 pb-24 pt-4">
          {activeTab === "today" && (
            <div className="space-y-4">
              <section className="rounded-lg border border-stone-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-[#e34747]">
                      Care Status
                    </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-950">
                      {riskCount > 0
                        ? "Caregiver review needed"
                        : nextMedication?.medication ?? "No medication"}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Margaret Lin · {analysisDate}
                    </p>
                  </div>

                  <span
                    className={
                      nextMedication?.highRisk
                        ? "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                        : "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                    }
                  >
                    {riskCount > 0 ? `${riskCount} Alerts` : "Stable"}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 rounded-md border border-stone-200 px-4 py-3 text-sm font-semibold text-neutral-700"
                  >
                    <Phone aria-hidden="true" size={16} /> Call patient
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-3 text-sm font-semibold text-white"
                  >
                    <Plus aria-hidden="true" size={16} /> Add note
                  </button>
                </div>
              </section>

              {riskCount > 0 && (
                <section className="rounded-lg border border-[#ffc8c3] bg-[#fff1f0] p-5 text-red-900">
                  <p className="text-xs font-semibold uppercase text-[#e34747]">
                    Caregiver Alert
                  </p>
                  <h2 className="mt-2 text-lg font-bold">
                    Attention recommended
                  </h2>
                  <p className="mt-2 text-sm leading-6">
                    {riskCount} medication routine needs review from recent
                    opening records.
                  </p>
                </section>
              )}

              <section className="rounded-lg border border-stone-200 bg-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-bold text-slate-950">
                    Event Timeline
                  </h2>
                </div>

                {visibleOpeningEvents.length === 0 ? (
                  <div className="mt-4 rounded-md bg-stone-100 p-4 text-sm text-neutral-500">
                    No opening records yet.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {visibleOpeningEvents.slice(0, 5).map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between gap-3 border-b border-stone-100 px-1 py-3 last:border-0"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            Slot {event.compartment} opened
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {event.medication} · {event.source}
                          </p>
                        </div>
                        <p className="text-right text-xs font-semibold text-slate-500">
                          {event.eventTime}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === "slots" && (
            <div className="space-y-4">
              <section className="rounded-lg border border-stone-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-[#e34747]">
                      Pillbox
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-slate-950">
                      Medication plan
                    </h2>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    {visibleOpeningEvents.length} opens
                  </span>
                </div>
              </section>

              <div className="grid grid-cols-2 gap-3">
                {activeMedicationSchedule.map((item) => {
                  const status = getMedicationStatus(
                    item,
                    medicationStatuses,
                    visibleOpeningEvents
                  );

                  return (
                    <article
                      key={item.compartment}
                    className={`min-h-48 rounded-lg border p-4 ${getStatusTone(
                        status
                      )}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
                            Slot
                          </p>
                          <h3 className="mt-1 text-3xl font-bold">
                            {item.compartment}
                          </h3>
                        </div>
                        <span
                          className={`mt-1 h-3 w-3 rounded-full ${getStatusDot(
                            status
                          )}`}
                        />
                      </div>

                      <p className="mt-4 min-h-12 text-sm font-bold leading-5">
                        {item.medication}
                      </p>
                      <p className="mt-2 text-xs font-semibold opacity-70">
                        {item.scheduledTime} · {item.bufferTimeMinutes} min
                      </p>
                      <p className="mt-3 truncate text-xs font-semibold opacity-80">
                        {status}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "insights" && (
            <div className="space-y-4">
              <section className="rounded-lg border border-stone-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-[#e34747]">
                      AI Insight
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-slate-950">
                      {report.overallConcernLevel} concern
                    </h2>
                  </div>
                  <span className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-bold text-white">
                    AI
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {report.caregiverSummary}
                </p>
              </section>

              <section className="rounded-lg border border-stone-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-950">
                  Medication Risk
                </h2>
                <div className="mt-4 space-y-3">
                  {report.medicationInsights.map((insight) => (
                    <div
                      key={insight.compartmentId}
                      className="rounded-md bg-stone-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Slot {insight.compartmentId}
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-950">
                            {insight.medicationName}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold capitalize text-slate-700">
                          {insight.concernLevel}
                        </span>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={
                            insight.concernScore >= 7
                              ? "h-full bg-red-500"
                              : insight.concernScore >= 3
                              ? "h-full bg-amber-400"
                              : "h-full bg-emerald-500"
                          }
                          style={{
                            width: `${Math.min(100, insight.concernScore * 10)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-stone-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-950">
                  Clinic Note
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {report.clinicVisitSummary}
                </p>
              </section>
            </div>
          )}
        </section>

        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-stone-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
          <div className="grid grid-cols-3 gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                    activeTab === tab.id ? "text-neutral-950" : "text-neutral-400"
                  }`}
                >
                  <Icon aria-hidden="true" size={21} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </main>
  );
}
