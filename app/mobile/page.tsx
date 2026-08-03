"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Check,
  CircleAlert,
  Clock3,
  LayoutGrid,
  MessageCircle,
  Phone,
  Pill,
  Plus,
  Sparkles,
  StickyNote,
} from "lucide-react";

import { generateCaregiverInsightReport } from "../../src/lib/aiCaregiverInsights";
import {
  careCircle,
  wellbeingAppearance,
  type CarePatient,
} from "../../src/lib/careCircle";
import { DEMO_DEVICE_ID } from "../../src/lib/hardwareProtocol";
import { generateRecordedMedicationStatuses } from "../../src/lib/safetyControl";
import { initialMedicationSchedule } from "../../src/lib/sampleData";
import { sampleHistoricalAdherenceRecords } from "../../src/lib/sampleHistory";
import type { HardwareEventsApiResponse } from "../../src/types/hardware";
import type {
  MedicationSchedule,
  OpeningEvent,
} from "../../src/types/pillbox";

type MobileTab = "today" | "slots" | "insights";

const tabs: { id: MobileTab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "today", label: "Today", icon: LayoutGrid },
  { id: "slots", label: "Meds", icon: Pill },
  { id: "insights", label: "Notes", icon: Sparkles },
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

function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Device history synced from Margaret's pillbox earlier today. */
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
        source: "hardware",
        deviceId: DEMO_DEVICE_ID,
        activeSlotAtEvent: item.compartment,
      };
    })
    .filter((event): event is OpeningEvent => event !== null);
}

function friendlyStatus(status: string): { label: string; chip: string } {
  if (status === "Taken - On Time")
    return { label: "Taken on time", chip: "bg-mint-soft text-mint-ink" };
  if (status === "Taken - Delayed")
    return { label: "Taken late", chip: "bg-honey-soft text-honey-ink" };
  if (status === "Duplicate Risk")
    return { label: "Opened twice", chip: "bg-coral-soft text-coral-ink" };
  if (status === "Opened Too Early")
    return { label: "Opened early", chip: "bg-coral-soft text-coral-ink" };
  if (status === "Missed / Very Late")
    return { label: "Missed", chip: "bg-coral-soft text-coral-ink" };
  return { label: "Still unopened", chip: "bg-cream-deep text-ink-soft" };
}

function StoriesRow({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section aria-label="Your care circle" className="overflow-x-auto">
      <div className="flex min-w-max items-start gap-4 px-5 pb-1 pt-4">
        {careCircle.map((person) => {
          const appearance = wellbeingAppearance(person.wellbeing);
          const isSelected = person.id === selectedId;

          return (
            <button
              key={person.id}
              type="button"
              onClick={() => onSelect(person.id)}
              className="flex w-[62px] flex-col items-center gap-1.5"
            >
              <span
                className={`relative flex h-14 w-14 items-center justify-center rounded-full border-[2.5px] bg-surface p-[2px] ${
                  isSelected ? appearance.ring : "border-line"
                }`}
              >
                <span
                  className={`flex h-full w-full items-center justify-center rounded-full text-xs font-bold ${person.avatarTone}`}
                >
                  {person.initials}
                </span>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-surface ${appearance.dot}`}
                />
              </span>
              <span
                className={`w-full truncate text-center text-[11px] ${
                  isSelected ? "font-bold text-ink" : "font-medium text-ink-soft"
                }`}
              >
                {person.firstName}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          className="flex w-[62px] flex-col items-center gap-1.5"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-ink-faint bg-surface text-ink-soft">
            <Plus aria-hidden="true" size={18} />
          </span>
          <span className="text-[11px] font-medium text-ink-soft">Add</span>
        </button>
      </div>
    </section>
  );
}

export default function MobilePage() {
  const [activeTab, setActiveTab] = useState<MobileTab>("today");
  const [selectedPatientId, setSelectedPatientId] = useState("margaret");
  const [reviewed, setReviewed] = useState(false);
  const [medicationSchedule] = useState<MedicationSchedule[]>(
    initialMedicationSchedule
  );
  const [openingEvents, setOpeningEvents] = useState<OpeningEvent[]>(() =>
    createSyncedDeviceHistory(initialMedicationSchedule, todayDateString())
  );
  const [analysisDate, setAnalysisDate] = useState(() => todayDateString());
  const latestHardwareEventId = useRef<string | null>(null);

  const activeMedicationSchedule = useMemo(
    () => medicationSchedule.filter((item) => item.medication.trim() !== ""),
    [medicationSchedule]
  );

  useEffect(() => {
    let isActive = true;

    async function syncHardwareOpeningEvents() {
      try {
        const response = await fetch("/api/hardware/events", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as HardwareEventsApiResponse;

        if (!isActive) {
          return;
        }

        setOpeningEvents((currentEvents) =>
          mergeOpeningEvents(currentEvents, data.events)
        );

        const latestEvent = data.events[0];
        if (latestEvent && latestEvent.id !== latestHardwareEventId.current) {
          latestHardwareEventId.current = latestEvent.id;
          setAnalysisDate(latestEvent.eventTime.slice(0, 10));
        }
      } catch {
        // The care feed keeps working when hardware is offline.
      }
    }

    syncHardwareOpeningEvents();
    const intervalId = window.setInterval(syncHardwareOpeningEvents, 4000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const medicationStatuses = useMemo(
    () =>
      generateRecordedMedicationStatuses(
        activeMedicationSchedule,
        openingEvents,
        analysisDate
      ),
    [activeMedicationSchedule, openingEvents, analysisDate]
  );

  const report = useMemo(
    () =>
      generateCaregiverInsightReport(
        sampleHistoricalAdherenceRecords,
        "patient-001"
      ),
    []
  );

  const selectedPatient: CarePatient =
    careCircle.find((person) => person.id === selectedPatientId) ??
    careCircle[0];
  const isLivePatient = selectedPatient.id === "margaret";
  const appearance = wellbeingAppearance(selectedPatient.wellbeing);

  const attentionStatuses = medicationStatuses.filter(
    (item) =>
      item.status === "Missed / Very Late" ||
      item.status === "Opened Too Early" ||
      item.status === "Duplicate Risk"
  );

  const takenCount = medicationStatuses.filter(
    (item) =>
      item.status === "Taken - On Time" ||
      item.status === "Taken - Delayed" ||
      item.status === "Duplicate Risk"
  ).length;

  const sortedStatuses = [...medicationStatuses].sort((a, b) =>
    a.scheduledTime.localeCompare(b.scheduledTime)
  );

  return (
    <main className="min-h-dvh bg-cream-deep text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-cream shadow-lift">
        <header className="border-b border-line bg-surface px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-mint-soft text-xs font-bold text-mint-ink">
                SC
              </div>
              <div>
                <h1 className="text-lg font-bold text-ink">
                  Good evening, Sarah
                </h1>
                <p className="text-xs text-ink-soft">
                  {attentionStatuses.length > 0
                    ? `${attentionStatuses.length} thing${attentionStatuses.length === 1 ? "" : "s"} to check on today`
                    : "Everyone is doing well today"}
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Notifications"
              title="Notifications"
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-soft"
            >
              <Bell aria-hidden="true" size={20} />
              {attentionStatuses.length > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-coral ring-2 ring-surface" />
              )}
            </button>
          </div>
        </header>

        <div className="border-b border-line bg-surface">
          <StoriesRow
            selectedId={selectedPatientId}
            onSelect={setSelectedPatientId}
          />
        </div>

        <section className="flex-1 px-4 pb-24 pt-4">
          {activeTab === "today" && (
            <div className="space-y-4">
              <article className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
                <div className="flex items-center gap-3 px-4 pt-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 bg-surface p-[2px] ${appearance.ring}`}
                  >
                    <span
                      className={`flex h-full w-full items-center justify-center rounded-full text-xs font-bold ${selectedPatient.avatarTone}`}
                    >
                      {selectedPatient.initials}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-bold text-ink">
                      {selectedPatient.name}
                    </h2>
                    <p className="truncate text-xs text-ink-soft">
                      {selectedPatient.age} · {selectedPatient.livingSituation}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${appearance.badge}`}
                  >
                    {reviewed ? "Reviewed" : appearance.label}
                  </span>
                </div>

                <div className="px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Today&apos;s doses
                  </p>
                  <p className="mt-1 text-xl font-bold text-ink">
                    {isLivePatient
                      ? `${takenCount} of ${medicationStatuses.length}`
                      : `${selectedPatient.snapshot.dosesTaken} of ${selectedPatient.snapshot.dosesTotal}`}{" "}
                    <span className="text-sm font-semibold text-ink-soft">
                      taken
                    </span>
                  </p>

                  {isLivePatient && attentionStatuses.length > 0 && !reviewed && (
                    <div className="mt-3 rounded-lg border border-coral-line bg-coral-soft px-3.5 py-3">
                      <p className="text-sm font-semibold text-coral-ink">
                        {attentionStatuses[0].medication} —{" "}
                        {friendlyStatus(attentionStatuses[0].status).label.toLowerCase()}
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-coral-ink/80">
                        Due at {attentionStatuses[0].scheduledTime}. A quick
                        call might help.
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2 border-t border-line-soft px-4 py-3">
                  <a
                    href={`tel:${selectedPatient.phone}`}
                    className="flex flex-col items-center gap-1 rounded-lg py-1.5 text-ink"
                  >
                    <Phone aria-hidden="true" size={19} />
                    <span className="text-[10px] font-semibold">Call</span>
                  </a>
                  <a
                    href={`sms:${selectedPatient.phone}`}
                    className="flex flex-col items-center gap-1 rounded-lg py-1.5 text-ink"
                  >
                    <MessageCircle aria-hidden="true" size={19} />
                    <span className="text-[10px] font-semibold">Message</span>
                  </a>
                  <button
                    type="button"
                    className="flex flex-col items-center gap-1 rounded-lg py-1.5 text-ink"
                  >
                    <StickyNote aria-hidden="true" size={19} />
                    <span className="text-[10px] font-semibold">Note</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewed((current) => !current)}
                    className={`flex flex-col items-center gap-1 rounded-lg py-1.5 ${
                      reviewed ? "text-mint-ink" : "text-ink"
                    }`}
                  >
                    <Check aria-hidden="true" size={19} />
                    <span className="text-[10px] font-semibold">
                      {reviewed ? "Reviewed" : "Review"}
                    </span>
                  </button>
                </div>
              </article>

              <div className="space-y-3">
                <h2 className="px-1 text-sm font-bold text-ink">Care feed</h2>

                {sortedStatuses.map((status) => {
                  const friendly = friendlyStatus(status.status);
                  const isAlert =
                    status.status === "Missed / Very Late" ||
                    status.status === "Duplicate Risk" ||
                    status.status === "Opened Too Early";

                  return (
                    <article
                      key={status.compartment}
                      className={`rounded-xl border bg-surface p-4 shadow-card ${
                        isAlert && !reviewed ? "border-coral-line" : "border-line"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${friendly.chip}`}
                        >
                          {status.status === "Taken - On Time" ? (
                            <Check aria-hidden="true" size={16} />
                          ) : isAlert ? (
                            <CircleAlert aria-hidden="true" size={16} />
                          ) : (
                            <Clock3 aria-hidden="true" size={16} />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <h3 className="truncate text-sm font-bold text-ink">
                              {status.medication}
                            </h3>
                            <time className="shrink-0 text-[11px] font-semibold text-ink-faint">
                              {status.firstOpenTime
                                ? status.firstOpenTime.slice(-5)
                                : status.scheduledTime}
                            </time>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-ink-soft">
                            Due {status.scheduledTime} · Compartment{" "}
                            {status.compartment}
                          </p>
                          <span
                            className={`mt-2 inline-block rounded-full px-2.5 py-1 text-[10px] font-bold ${friendly.chip}`}
                          >
                            {friendly.label}
                          </span>
                        </div>
                      </div>

                      {isAlert && !reviewed && (
                        <div className="mt-3 flex items-center gap-2 border-t border-line-soft pt-3">
                          <a
                            href={`tel:${selectedPatient.phone}`}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-action px-3 py-2 text-xs font-semibold text-on-action"
                          >
                            <Phone aria-hidden="true" size={13} /> Call
                          </a>
                          <button
                            type="button"
                            onClick={() => setReviewed(true)}
                            className="flex-1 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink"
                          >
                            Mark reviewed
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "slots" && (
            <div className="space-y-3">
              <h2 className="px-1 text-sm font-bold text-ink">
                Margaret&apos;s medication plan
              </h2>
              {sortedStatuses.map((status) => {
                const friendly = friendlyStatus(status.status);
                return (
                  <article
                    key={status.compartment}
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 shadow-card"
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${friendly.chip}`}
                    >
                      {status.compartment}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold text-ink">
                        {status.medication}
                      </h3>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        Every day at {status.scheduledTime}
                        {status.highRisk ? " · High risk" : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${friendly.chip}`}
                    >
                      {friendly.label}
                    </span>
                  </article>
                );
              })}
            </div>
          )}

          {activeTab === "insights" && (
            <div className="space-y-4">
              <section className="rounded-xl border border-line bg-surface p-5 shadow-card">
                <div className="flex items-center gap-2">
                  <Sparkles aria-hidden="true" size={16} className="text-coral" />
                  <h2 className="text-sm font-bold text-ink">
                    This week with Margaret
                  </h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-soft">
                  {report.caregiverSummary}
                </p>
              </section>

              <section className="rounded-xl border border-line bg-surface p-5 shadow-card">
                <h2 className="text-sm font-bold text-ink">
                  For the next clinic visit
                </h2>
                <p className="mt-3 text-sm leading-6 text-ink-soft">
                  {report.clinicVisitSummary}
                </p>
              </section>
            </div>
          )}
        </section>

        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-line bg-surface/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
          <div className="grid grid-cols-3 gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                    activeTab === tab.id ? "text-ink" : "text-ink-faint"
                  }`}
                >
                  <Icon
                    aria-hidden="true"
                    size={21}
                    strokeWidth={activeTab === tab.id ? 2.5 : 2}
                  />
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
