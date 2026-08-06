"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Search } from "lucide-react";

import { ConnectedDemoBar } from "../src/components/ConnectedDemoBar";
import { DeviceFeedPanel } from "../src/components/DeviceFeedPanel";
import InitialisationSetupPanel from "../src/components/InitialisationSetupPanel";
import MainSectionTabs, {
  type MainSectionTab,
} from "../src/components/MainSectionTabs";
import { Sidebar } from "../src/components/Sidebar";
import { useIntegrationMode } from "../src/hooks/useIntegrationMode";

import { getRecommendedBufferTime } from "../src/lib/scheduleDefaults";
import { createOpeningEvent } from "../src/lib/hardwareSimulation";
import { hardwarePlanToMedicationSchedule } from "../src/lib/integrationMode";

import {
  calculateDashboardKpis,
  generateRecordedMedicationStatuses,
} from "../src/lib/safetyControl";

import { initialMedicationSchedule } from "../src/lib/sampleData";

import type { MedicationSchedule, OpeningEvent } from "../src/types/pillbox";
import type {
  HardwareEventsApiResponse,
  HardwarePlanApiResponse,
} from "../src/types/hardware";

import DashboardPanel from "../src/components/DashboardPanel";

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

function createCaregiverDemoEvents(
  schedule: MedicationSchedule[],
  demoDate: string
): OpeningEvent[] {
  const demoEventSpecs = [
    {
      id: "care-demo-evening-heart",
      compartmentId: 4,
      openedAt: `${demoDate} 20:46`,
    },
    {
      id: "care-demo-midday-vitamin",
      compartmentId: 3,
      openedAt: `${demoDate} 14:22`,
    },
    {
      id: "care-demo-morning-diabetes",
      compartmentId: 2,
      openedAt: `${demoDate} 09:22`,
    },
    {
      id: "care-demo-morning-bp-repeat",
      compartmentId: 1,
      openedAt: `${demoDate} 08:18`,
    },
    {
      id: "care-demo-morning-bp",
      compartmentId: 1,
      openedAt: `${demoDate} 08:06`,
    },
  ];

  return demoEventSpecs
    .map((spec): OpeningEvent | null => {
      const scheduleItem = schedule.find(
        (item) => item.compartment === spec.compartmentId
      );

      if (!scheduleItem) {
        return null;
      }

      return {
        id: spec.id,
        eventTime: spec.openedAt,
        receivedAt: new Date(
          spec.openedAt.replace(" ", "T") + ":00"
        ).toISOString(),
        compartment: scheduleItem.compartment,
        medication: scheduleItem.medication,
        eventType: "lid_open",
        source: "simulation",
        deviceId: "SOFTWARE-SIMULATOR",
        activeSlotAtEvent: scheduleItem.compartment,
      };
    })
    .filter((event): event is OpeningEvent => event !== null);
}

export default function Home() {
  const integration = useIntegrationMode();
  const [activeTab, setActiveTab] = useState<MainSectionTab>("dashboard");

  const [standaloneMedicationSchedule, setStandaloneMedicationSchedule] =
    useState<MedicationSchedule[]>(initialMedicationSchedule);
  const [sourcePlan, setSourcePlan] = useState<{
    deviceId: string;
    schedule: MedicationSchedule[];
  } | null>(null);

  const [openingEvents, setOpeningEvents] = useState<OpeningEvent[]>(() =>
    createCaregiverDemoEvents(initialMedicationSchedule, "2026-06-26")
  );
  const [sourceOpeningEvents, setSourceOpeningEvents] = useState<OpeningEvent[]>([]);

  const [analysisDate, setAnalysisDate] = useState("2026-06-26");
  const [analysisTime, setAnalysisTime] = useState("21:05");
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
          setAnalysisTime(latestEvent.eventTime.slice(-5));
        }
      } catch {
        // Standalone data remains available if the selected source goes offline.
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

  const activeMedicationSchedule = useMemo(
    () => medicationSchedule.filter((item) => item.medication.trim() !== ""),
    [medicationSchedule]
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

  async function handleScheduleChange(nextSchedule: MedicationSchedule[]) {
    if (integration.activeDeviceId) {
      const response = await fetch("/api/hardware/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: integration.activeDeviceId,
          slots: nextSchedule.map((item) => ({
            slotId: item.compartment,
            medication: item.medication,
            scheduledTime: item.scheduledTime,
            highRisk: item.highRisk,
            bufferTimeMinutes: item.bufferTimeMinutes,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("The medication plan could not be sent to the selected source.");
      }
    }

    if (integration.activeDeviceId) {
      setSourcePlan({
        deviceId: integration.activeDeviceId,
        schedule: nextSchedule,
      });
    } else {
      setStandaloneMedicationSchedule(nextSchedule);
    }
  }

  async function handleApplyRecommendedBufferTimes() {
    const nextSchedule = medicationSchedule.map((item) => ({
      ...item,
      bufferTimeMinutes: getRecommendedBufferTime(item.highRisk),
    }));
    await handleScheduleChange(nextSchedule);
  }

  function handleLoadCareShiftSnapshot() {
    const demoDate = "2026-06-26";
    setAnalysisDate(demoDate);
    setAnalysisTime("21:05");
    setOpeningEvents(createCaregiverDemoEvents(activeMedicationSchedule, demoDate));
    setActiveTab("dashboard");
  }

  function handleSimulateOpening(item: MedicationSchedule) {
    const simulatedTime = `${analysisDate} ${analysisTime}`;
    setOpeningEvents((currentEvents) => [
      createOpeningEvent(item, simulatedTime),
      ...currentEvents,
    ]);
  }

  function handleClearSimulationEvents() {
    setOpeningEvents([]);
  }

  return (
    <main className="min-h-screen bg-[#fafafa] text-neutral-950">
      <div className="flex min-h-screen">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <section className="min-w-0 flex-1 pb-24 lg:pb-0">
          <ConnectedDemoBar
            activeSurface="dashboard"
            mode={integration.mode}
            activeDeviceId={integration.activeDeviceId}
            isChangingMode={integration.isChangingMode}
            onModeChange={integration.setMode}
          />

          <div className="mx-auto w-full max-w-[1440px]">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-stone-200 bg-[#fafafa]/95 px-4 backdrop-blur sm:px-7 lg:h-20 lg:px-10">
              <div>
                <h1 className="text-lg font-bold text-neutral-950 lg:text-xl">
                  Good evening, Sarah
                </h1>
                <p className="mt-0.5 text-xs text-neutral-500 lg:text-sm">
                  {analysisDate} · reviewing through {analysisTime}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Search"
                  title="Search"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 transition hover:bg-stone-100 hover:text-neutral-950"
                >
                  <Search aria-hidden="true" size={20} />
                </button>
                <button
                  type="button"
                  aria-label="Notifications"
                  title="Notifications"
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 transition hover:bg-stone-100 hover:text-neutral-950"
                >
                  <Bell aria-hidden="true" size={20} />
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ff5c5c] ring-2 ring-[#fafafa]" />
                </button>
                <div className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#dff4ef] text-xs font-bold text-teal-800 lg:hidden">
                  SC
                </div>
              </div>
            </header>

            <MainSectionTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            <div className="px-4 py-5 sm:px-7 lg:px-10 lg:py-8">
              {activeTab === "initialisation" && (
                <InitialisationSetupPanel
                  schedule={medicationSchedule}
                  onScheduleChange={handleScheduleChange}
                  onApplyRecommendedBufferTimes={handleApplyRecommendedBufferTimes}
                />
              )}

              {activeTab === "pillbox" && (
                <DeviceFeedPanel
                  analysisDate={analysisDate}
                  analysisTime={analysisTime}
                  events={visibleOpeningEvents}
                  schedule={activeMedicationSchedule}
                  onAnalysisDateChange={setAnalysisDate}
                  onAnalysisTimeChange={setAnalysisTime}
                  onLoadCareShiftSnapshot={handleLoadCareShiftSnapshot}
                  onSimulateOpening={handleSimulateOpening}
                  onClearSimulationEvents={handleClearSimulationEvents}
                  integrationMode={integration.mode}
                  activeDeviceId={integration.activeDeviceId}
                />
              )}

              {activeTab === "dashboard" && (
                <DashboardPanel
                  kpis={dashboardKpis}
                  statuses={medicationStatuses}
                  events={visibleOpeningEvents}
                  schedule={activeMedicationSchedule}
                  analysisDate={analysisDate}
                  analysisTime={analysisTime}
                />
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
