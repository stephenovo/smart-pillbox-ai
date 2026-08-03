"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";

import CareMessagesPanel from "../src/components/CareMessagesPanel";
import SettingsPanel from "../src/components/SettingsPanel";
import { DeviceFeedPanel } from "../src/components/DeviceFeedPanel";
import InitialisationSetupPanel from "../src/components/InitialisationSetupPanel";
import MainSectionTabs, {
  type MainSectionTab,
} from "../src/components/MainSectionTabs";
import { Sidebar } from "../src/components/Sidebar";
import DashboardPanel from "../src/components/DashboardPanel";

import { getRecommendedBufferTime } from "../src/lib/scheduleDefaults";
import { DEMO_DEVICE_ID } from "../src/lib/hardwareProtocol";
import { generateRecordedMedicationStatuses } from "../src/lib/safetyControl";
import { initialMedicationSchedule } from "../src/lib/sampleData";

import type { MedicationSchedule, OpeningEvent } from "../src/types/pillbox";
import type {
  HardwareDeviceState,
  HardwareEventsApiResponse,
} from "../src/types/hardware";

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

function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Device history synced from Margaret's pillbox earlier today.
 * Real openings recorded by the hardware — no software events.
 */
function createSyncedDeviceHistory(
  schedule: MedicationSchedule[],
  date: string
): OpeningEvent[] {
  const specs = [
    { id: "device-history-c3", compartmentId: 3, openedAt: `${date} 13:40` },
    { id: "device-history-c1-b", compartmentId: 1, openedAt: `${date} 08:18` },
    { id: "device-history-c2", compartmentId: 2, openedAt: `${date} 08:12` },
    { id: "device-history-c1-a", compartmentId: 1, openedAt: `${date} 08:06` },
  ];

  return specs
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
        receivedAt: new Date(spec.openedAt.replace(" ", "T") + ":00").toISOString(),
        compartment: scheduleItem.compartment,
        medication: scheduleItem.medication,
        eventType: "lid_open",
        source: "hardware",
        deviceId: DEMO_DEVICE_ID,
        activeSlotAtEvent: scheduleItem.compartment,
      };
    })
    .filter((event): event is OpeningEvent => event !== null);
}

function greetingForTime(time: string): string {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<MainSectionTab>("dashboard");

  const [medicationSchedule, setMedicationSchedule] =
    useState<MedicationSchedule[]>(initialMedicationSchedule);

  const [openingEvents, setOpeningEvents] = useState<OpeningEvent[]>(() =>
    createSyncedDeviceHistory(initialMedicationSchedule, todayDateString())
  );

  const [analysisDate, setAnalysisDate] = useState(() => todayDateString());
  const [analysisTime, setAnalysisTime] = useState("21:05");
  const [deviceState, setDeviceState] = useState<HardwareDeviceState | null>(
    null
  );
  const latestHardwareEventId = useRef<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function syncHardware() {
      try {
        const [eventsResponse, stateResponse] = await Promise.all([
          fetch("/api/hardware/events", { cache: "no-store" }),
          fetch(
            `/api/hardware/state?deviceId=${encodeURIComponent(DEMO_DEVICE_ID)}`,
            { cache: "no-store" }
          ),
        ]);

        if (!isActive) {
          return;
        }

        if (eventsResponse.ok) {
          const data = (await eventsResponse.json()) as HardwareEventsApiResponse;
          setOpeningEvents((currentEvents) =>
            mergeOpeningEvents(currentEvents, data.events)
          );

          const latestEvent = data.events[0];
          if (latestEvent && latestEvent.id !== latestHardwareEventId.current) {
            latestHardwareEventId.current = latestEvent.id;
            setAnalysisDate(latestEvent.eventTime.slice(0, 10));
            setAnalysisTime(latestEvent.eventTime.slice(-5));
          }
        }

        if (stateResponse.ok) {
          setDeviceState((await stateResponse.json()) as HardwareDeviceState);
        }
      } catch {
        // Hardware sync is best-effort; the care feed keeps working offline.
      }
    }

    syncHardware();
    const intervalId = window.setInterval(syncHardware, 4000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const activeMedicationSchedule = useMemo(
    () => medicationSchedule.filter((item) => item.medication.trim() !== ""),
    [medicationSchedule]
  );

  const medicationStatuses = useMemo(
    () =>
      generateRecordedMedicationStatuses(
        activeMedicationSchedule,
        openingEvents,
        analysisDate
      ),
    [activeMedicationSchedule, openingEvents, analysisDate]
  );

  async function handleScheduleChange(nextSchedule: MedicationSchedule[]) {
    const response = await fetch("/api/hardware/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: DEMO_DEVICE_ID,
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
      throw new Error("The medication plan could not be sent to the device API.");
    }

    setMedicationSchedule(nextSchedule);
  }

  async function handleApplyRecommendedBufferTimes() {
    const nextSchedule = medicationSchedule.map((item) => ({
      ...item,
      bufferTimeMinutes: getRecommendedBufferTime(item.highRisk),
    }));
    await handleScheduleChange(nextSchedule);
  }

  return (
    <main className="min-h-screen bg-cream text-ink">
      <div className="flex min-h-screen">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <section className="min-w-0 flex-1 pb-24 lg:pb-0">
          <div className="mx-auto w-full max-w-[1440px]">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-cream/95 px-4 backdrop-blur sm:px-7 lg:h-20 lg:px-10">
              <div>
                <h1 className="text-lg font-bold text-ink lg:text-xl">
                  {greetingForTime(analysisTime)}, Sarah
                </h1>
                <p className="mt-0.5 text-xs text-ink-soft lg:text-sm">
                  {analysisDate} · here&apos;s what&apos;s happening with your
                  circle
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Notifications"
                  title="Notifications"
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition hover:bg-cream-deep hover:text-ink"
                >
                  <Bell aria-hidden="true" size={20} />
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-coral ring-2 ring-cream" />
                </button>
                <div className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-mint-soft text-xs font-bold text-mint-ink lg:hidden">
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
                  statuses={medicationStatuses}
                  analysisTime={analysisTime}
                  onScheduleChange={handleScheduleChange}
                  onApplyRecommendedBufferTimes={handleApplyRecommendedBufferTimes}
                />
              )}

              {activeTab === "pillbox" && (
                <DeviceFeedPanel
                  analysisDate={analysisDate}
                  analysisTime={analysisTime}
                  events={openingEvents}
                  schedule={activeMedicationSchedule}
                  deviceState={deviceState}
                  onAnalysisDateChange={setAnalysisDate}
                />
              )}

              {activeTab === "messages" && <CareMessagesPanel />}

              {activeTab === "settings" && <SettingsPanel />}

              {activeTab === "dashboard" && (
                <DashboardPanel
                  statuses={medicationStatuses}
                  events={openingEvents}
                  schedule={activeMedicationSchedule}
                  analysisDate={analysisDate}
                  analysisTime={analysisTime}
                  deviceState={deviceState}
                />
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
