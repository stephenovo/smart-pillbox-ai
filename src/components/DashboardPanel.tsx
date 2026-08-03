"use client";

import { useMemo, useState } from "react";
import {
  BatteryMedium,
  Check,
  CircleAlert,
  Clock3,
  MessageCircle,
  Phone,
  Pill,
  Plus,
  Radio,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Wifi,
  X,
} from "lucide-react";
import AiReportPanel from "./AiReportPanel";
import {
  careCircle,
  wellbeingAppearance,
  type CarePatient,
} from "../lib/careCircle";
import type { HardwareDeviceState } from "../types/hardware";
import type {
  DailyMedicationStatus,
  MedicationSchedule,
  OpeningEvent,
  SafetyStatus,
} from "../types/pillbox";

type DashboardPanelProps = {
  statuses: DailyMedicationStatus[];
  events: OpeningEvent[];
  schedule: MedicationSchedule[];
  analysisDate: string;
  analysisTime: string;
  deviceState: HardwareDeviceState | null;
};

type CareTaskTone = "attention" | "monitor" | "complete" | "due" | "upcoming";

type CareTask = {
  compartment: number;
  medication: string;
  scheduledTime: string;
  highRisk: boolean;
  status: SafetyStatus | "Due soon" | "Awaiting opening" | "Upcoming";
  detail: string;
  tone: CareTaskTone;
  sortOrder: number;
};

type CareNote = {
  id: string;
  patientId: string;
  time: string;
  text: string;
};

type FeedItem = {
  id: string;
  patientId: string;
  time: string;
  kind: "missed" | "late" | "taken" | "duplicate" | "note";
  title: string;
  detail: string;
};

const patientInsights: Record<string, string> = {
  margaret:
    "Margaret's mornings are steady, but her evening heart medication has been late or missed three times this week. A short call after dinner usually gets her back on track.",
};

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function isAttentionStatus(
  status: SafetyStatus
): status is "Missed / Very Late" | "Opened Too Early" | "Duplicate Risk" {
  return (
    status === "Missed / Very Late" ||
    status === "Opened Too Early" ||
    status === "Duplicate Risk"
  );
}

function buildCareTasks(
  schedule: MedicationSchedule[],
  statuses: DailyMedicationStatus[],
  analysisTime: string
): CareTask[] {
  const currentMinutes = timeToMinutes(analysisTime);

  return schedule
    .map((item): CareTask => {
      const recordedStatus = statuses.find(
        (status) => status.compartment === item.compartment
      );

      if (recordedStatus) {
        if (isAttentionStatus(recordedStatus.status)) {
          return {
            compartment: item.compartment,
            medication: item.medication,
            scheduledTime: item.scheduledTime,
            highRisk: item.highRisk,
            status: recordedStatus.status,
            detail:
              recordedStatus.status === "Duplicate Risk"
                ? `The compartment was opened ${recordedStatus.openingCount} times, ${recordedStatus.firstOpenTime} first. Worth checking the dose wasn't repeated.`
                : `Due at ${item.scheduledTime}, first opening at ${recordedStatus.firstOpenTime}.`,
            tone: "attention",
            sortOrder: 0,
          };
        }

        if (recordedStatus.status === "Taken - Delayed") {
          return {
            compartment: item.compartment,
            medication: item.medication,
            scheduledTime: item.scheduledTime,
            highRisk: item.highRisk,
            status: recordedStatus.status,
            detail: `Taken ${recordedStatus.delayMinutes} min after the reminder.`,
            tone: "monitor",
            sortOrder: 1,
          };
        }

        return {
          compartment: item.compartment,
          medication: item.medication,
          scheduledTime: item.scheduledTime,
          highRisk: item.highRisk,
          status: recordedStatus.status,
          detail: `Opened at ${recordedStatus.firstOpenTime}, right on schedule.`,
          tone: "complete",
          sortOrder: 3,
        };
      }

      const minutesPastSchedule =
        currentMinutes - timeToMinutes(item.scheduledTime);

      if (minutesPastSchedule > item.bufferTimeMinutes) {
        return {
          compartment: item.compartment,
          medication: item.medication,
          scheduledTime: item.scheduledTime,
          highRisk: item.highRisk,
          status: "Awaiting opening",
          detail: `Due at ${item.scheduledTime} and still unopened — ${minutesPastSchedule} min ago.`,
          tone: "attention",
          sortOrder: 0,
        };
      }

      if (minutesPastSchedule >= -15) {
        return {
          compartment: item.compartment,
          medication: item.medication,
          scheduledTime: item.scheduledTime,
          highRisk: item.highRisk,
          status: "Due soon",
          detail: "The reminder window is active or coming up.",
          tone: "due",
          sortOrder: 2,
        };
      }

      return {
        compartment: item.compartment,
        medication: item.medication,
        scheduledTime: item.scheduledTime,
        highRisk: item.highRisk,
        status: "Upcoming",
        detail: "Nothing needed yet.",
        tone: "upcoming",
        sortOrder: 4,
      };
    })
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.scheduledTime.localeCompare(b.scheduledTime)
    );
}

function friendlyTaskLabel(task: CareTask): string {
  if (task.status === "Duplicate Risk") return "Opened twice";
  if (task.status === "Missed / Very Late") return "Missed dose";
  if (task.status === "Opened Too Early") return "Opened early";
  if (task.status === "Taken - Delayed") return "Taken late";
  if (task.status === "Taken - On Time") return "Taken on time";
  if (task.status === "Awaiting opening") return "Still unopened";
  return task.status;
}

function feedKindAppearance(kind: FeedItem["kind"]) {
  if (kind === "missed" || kind === "duplicate") {
    return { chip: "bg-coral-soft text-coral-ink", icon: CircleAlert };
  }
  if (kind === "late") {
    return { chip: "bg-honey-soft text-honey-ink", icon: Clock3 };
  }
  if (kind === "note") {
    return { chip: "bg-sky-soft text-sky-ink", icon: StickyNote };
  }
  return { chip: "bg-mint-soft text-mint-ink", icon: Check };
}

function feedKindLabel(kind: FeedItem["kind"]): string {
  if (kind === "missed") return "Missed dose";
  if (kind === "duplicate") return "Opened twice";
  if (kind === "late") return "Late dose";
  if (kind === "note") return "Care note";
  return "Dose taken";
}

function friendlyEventTitle(event: OpeningEvent): string {
  if (event.eventType === "wrong_slot_open") {
    return `Compartment ${event.compartment} opened during another slot`;
  }
  return `Compartment ${event.compartment} opened`;
}

function PatientStories({
  selectedId,
  liveWellbeing,
  onSelect,
}: {
  selectedId: string;
  liveWellbeing: CarePatient["wellbeing"];
  onSelect: (id: string) => void;
}) {
  return (
    <section aria-label="Your care circle" className="overflow-x-auto pb-1">
      <div className="flex min-w-max items-start gap-5">
        {careCircle.map((person) => {
          const wellbeing =
            person.id === "margaret" ? liveWellbeing : person.wellbeing;
          const appearance = wellbeingAppearance(wellbeing);
          const isSelected = person.id === selectedId;

          return (
            <button
              key={person.id}
              type="button"
              onClick={() => onSelect(person.id)}
              className="group flex w-[72px] flex-col items-center gap-2"
            >
              <span
                className={`relative flex h-16 w-16 items-center justify-center rounded-full border-[2.5px] bg-surface p-[3px] transition group-hover:scale-[1.04] ${
                  isSelected ? appearance.ring : "border-line"
                }`}
              >
                <span
                  className={`flex h-full w-full items-center justify-center rounded-full text-sm font-bold ${person.avatarTone}`}
                >
                  {person.initials}
                </span>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-surface ${appearance.dot}`}
                />
              </span>
              <span
                className={`w-full truncate text-center text-xs font-medium ${
                  isSelected ? "font-bold text-ink" : "text-ink-soft"
                }`}
              >
                {person.firstName}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          className="group flex w-[72px] flex-col items-center gap-2"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-ink-faint bg-surface text-ink-soft transition group-hover:border-ink group-hover:text-ink">
            <Plus aria-hidden="true" size={20} />
          </span>
          <span className="text-xs font-medium text-ink-soft">Add person</span>
        </button>
      </div>
    </section>
  );
}

function PatientStatusCard({
  patient,
  wellbeing,
  tasks,
  reviewed,
  latestEvent,
  onAddNote,
  onMarkReviewed,
}: {
  patient: CarePatient;
  wellbeing: CarePatient["wellbeing"];
  tasks: CareTask[] | null;
  reviewed: boolean;
  latestEvent: string;
  onAddNote: () => void;
  onMarkReviewed: () => void;
}) {
  const appearance = wellbeingAppearance(wellbeing);

  const taken = tasks
    ? tasks.filter(
        (task) => task.tone === "complete" || task.tone === "monitor"
      ).length +
      tasks.filter(
        (task) => task.tone === "attention" && task.status === "Duplicate Risk"
      ).length
    : patient.snapshot.dosesTaken;
  const total = tasks ? tasks.length : patient.snapshot.dosesTotal;
  const attentionTasks = tasks
    ? tasks.filter(
        (task) => task.tone === "attention" && task.status !== "Duplicate Risk"
      )
    : [];

  return (
    <article className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
      <header className="flex items-center gap-3 px-5 pt-5">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[2.5px] bg-surface p-[2px] ${appearance.ring}`}
        >
          <span
            className={`flex h-full w-full items-center justify-center rounded-full text-sm font-bold ${patient.avatarTone}`}
          >
            {patient.initials}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold text-ink">{patient.name}</h2>
          <p className="truncate text-xs text-ink-soft">
            {patient.age} · {patient.livingSituation} · {patient.city}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${appearance.badge}`}
        >
          {reviewed ? "Reviewed today" : appearance.label}
        </span>
      </header>

      <div className="px-5 py-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Today&apos;s doses
            </p>
            <p className="mt-1.5 text-2xl font-bold text-ink">
              {taken} of {total}{" "}
              <span className="text-sm font-semibold text-ink-soft">taken</span>
            </p>
          </div>
          <p className="max-w-[45%] truncate text-right text-xs text-ink-soft">
            {latestEvent}
          </p>
        </div>

        <div className="mt-3 flex gap-1.5">
          {Array.from({ length: total }).map((_, index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full ${
                index < taken ? "bg-mint" : "bg-cream-deep"
              }`}
            />
          ))}
        </div>

        {attentionTasks.length > 0 && !reviewed && (
          <div className="mt-4 rounded-lg border border-coral-line bg-coral-soft px-4 py-3">
            <p className="text-sm font-semibold text-coral-ink">
              {attentionTasks[0].medication} — {friendlyTaskLabel(attentionTasks[0]).toLowerCase()}
            </p>
            <p className="mt-0.5 text-xs leading-5 text-coral-ink/80">
              {attentionTasks[0].detail}
            </p>
          </div>
        )}

        <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-cream px-4 py-3">
          <Sparkles aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-coral" />
          <p className="text-sm leading-6 text-ink-soft">
            {patientInsights[patient.id] ?? patient.wellbeingNote}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line-soft px-5 py-4">
        <a
          href={`tel:${patient.phone}`}
          className="flex items-center gap-2 rounded-lg bg-action px-4 py-2.5 text-sm font-semibold text-on-action transition hover:bg-action-hover"
        >
          <Phone aria-hidden="true" size={16} /> Call
        </a>
        <a
          href={`sms:${patient.phone}`}
          className="flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-cream"
        >
          <MessageCircle aria-hidden="true" size={16} /> Message
        </a>
        <button
          type="button"
          onClick={onAddNote}
          className="flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-cream"
        >
          <StickyNote aria-hidden="true" size={16} /> Add note
        </button>
        <button
          type="button"
          onClick={onMarkReviewed}
          className={`ml-auto flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            reviewed
              ? "bg-mint-soft text-mint-ink"
              : "border border-line text-ink hover:bg-cream"
          }`}
        >
          <Check aria-hidden="true" size={16} />
          {reviewed ? "Reviewed" : "Mark reviewed"}
        </button>
      </div>
    </article>
  );
}

function CareFeed({
  items,
  reviewedIds,
  onReview,
}: {
  items: FeedItem[];
  reviewedIds: string[];
  onReview: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-lg border border-line bg-surface p-8 text-center shadow-card">
        <ShieldCheck className="mx-auto text-mint" size={28} />
        <h2 className="mt-3 text-base font-bold text-ink">
          Nothing needs your attention
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          New care updates will appear here as they happen.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="care-feed-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="care-feed-heading" className="text-lg font-bold text-ink">
          Care feed
        </h2>
        <span className="text-xs font-semibold text-ink-faint">
          {items.length} updates today
        </span>
      </div>

      {items.map((item) => {
        const patient = careCircle.find(
          (person) => person.id === item.patientId
        );
        const appearance = feedKindAppearance(item.kind);
        const Icon = appearance.icon;
        const isReviewed = reviewedIds.includes(item.id);
        const needsAction =
          (item.kind === "missed" || item.kind === "duplicate") && !isReviewed;

        return (
          <article
            key={item.id}
            className={`rounded-lg border bg-surface p-5 shadow-card transition ${
              needsAction
                ? "border-coral-line"
                : isReviewed
                  ? "border-line opacity-60"
                  : "border-line"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${patient?.avatarTone ?? "bg-cream-deep text-ink"}`}
              >
                {patient?.initials ?? "?"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="truncate text-sm font-bold text-ink">
                    {item.title}
                  </h3>
                  <time className="shrink-0 text-xs font-semibold text-ink-faint">
                    {item.time}
                  </time>
                </div>
                <p className="mt-1.5 text-sm leading-6 text-ink-soft">
                  {item.detail}
                </p>
                <span
                  className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${appearance.chip}`}
                >
                  <Icon aria-hidden="true" size={12} />
                  {feedKindLabel(item.kind)}
                </span>
              </div>
            </div>

            {needsAction && patient && (
              <div className="mt-4 flex items-center gap-2 border-t border-line-soft pt-4">
                <a
                  href={`tel:${patient.phone}`}
                  className="flex items-center gap-2 rounded-lg bg-action px-3.5 py-2 text-xs font-semibold text-on-action transition hover:bg-action-hover"
                >
                  <Phone aria-hidden="true" size={14} /> Call {patient.firstName}
                </a>
                <button
                  type="button"
                  onClick={() => onReview(item.id)}
                  className="ml-auto rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-ink transition hover:bg-cream"
                >
                  Mark reviewed
                </button>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

function SummaryRail({
  patient,
  wellbeing,
  events,
  deviceState,
  lastNote,
}: {
  patient: CarePatient;
  wellbeing: CarePatient["wellbeing"];
  events: OpeningEvent[];
  deviceState: HardwareDeviceState | null;
  lastNote: string;
}) {
  const appearance = wellbeingAppearance(wellbeing);
  const rhythmAverage = Math.round(
    patient.weeklyRhythm.reduce((sum, value) => sum + value, 0) /
      patient.weeklyRhythm.length
  );
  const isSynced = deviceState?.connectionStatus === "connected";
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <aside className="space-y-5 xl:sticky xl:top-28 xl:self-start">
      <section className="rounded-lg border border-line bg-surface p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${patient.avatarTone}`}
          >
            {patient.initials}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-bold text-ink">{patient.name}</h2>
            <p className="truncate text-xs text-ink-soft">
              {patient.relation} · {patient.age} · {patient.city}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${appearance.badge}`}
          >
            {appearance.label}
          </span>
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Emergency contacts
        </p>
        <div className="mt-2 divide-y divide-line-soft">
          {patient.emergencyContacts.map((contact) => (
            <div
              key={contact.phone}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {contact.name}
                  {contact.isPrimary && (
                    <span className="ml-2 rounded-full bg-cream-deep px-2 py-0.5 text-[10px] font-bold text-ink-soft">
                      Primary
                    </span>
                  )}
                </p>
                <p className="text-xs text-ink-soft">{contact.relation}</p>
              </div>
              <a
                href={`tel:${contact.phone}`}
                aria-label={`Call ${contact.name}`}
                title={`Call ${contact.name}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink transition hover:bg-cream"
              >
                <Phone aria-hidden="true" size={15} />
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-ink">Device sync</h2>
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              isSynced
                ? "bg-mint-soft text-mint-ink"
                : "bg-cream-deep text-ink-soft"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isSynced ? "bg-mint" : "bg-ink-faint"
              }`}
            />
            {isSynced ? "Synced" : "Waiting"}
          </span>
        </div>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-ink-soft">
              <Radio aria-hidden="true" size={15} /> {patient.device.name}
            </dt>
            <dd className="font-semibold text-ink">
              {deviceState?.lastEventAt
                ? `Last event ${deviceState.lastEventAt.slice(11, 16)}`
                : "No events yet"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-ink-soft">
              <BatteryMedium aria-hidden="true" size={15} /> Battery
            </dt>
            <dd className="font-semibold text-ink">
              {patient.device.batteryPercent}%
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-ink-soft">
              <Wifi aria-hidden="true" size={15} /> Wi-Fi
            </dt>
            <dd className="font-semibold capitalize text-ink">
              {patient.device.wifi}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-line bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-ink">7-day rhythm</h2>
          <span className="text-sm font-bold text-mint-ink">
            {rhythmAverage}%
          </span>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-2">
          {patient.weeklyRhythm.map((value, index) => (
            <div key={`${dayLabels[index]}-${index}`} className="text-center">
              <div className="flex h-16 items-end overflow-hidden rounded-sm bg-cream-deep">
                <span
                  className={`block w-full ${
                    value >= 90
                      ? "bg-mint"
                      : value >= 70
                        ? "bg-honey"
                        : "bg-coral"
                  }`}
                  style={{ height: `${Math.max(value, 8)}%` }}
                />
              </div>
              <p className="mt-2 text-[10px] font-semibold text-ink-faint">
                {dayLabels[index]}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-ink-soft">
          {patient.wellbeingNote}
        </p>
      </section>

      <section className="rounded-lg border border-line bg-surface p-5 shadow-card">
        <div className="flex items-center gap-2">
          <Radio aria-hidden="true" className="text-mint" size={17} />
          <h2 className="font-bold text-ink">Latest activity</h2>
        </div>
        <div className="mt-4 divide-y divide-line-soft">
          {events.length === 0 && (
            <p className="py-2 text-sm text-ink-soft">
              No device activity yet today.
            </p>
          )}
          {events.slice(0, 3).map((event) => (
            <div key={event.id} className="flex gap-3 py-3 first:pt-0">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  event.eventType === "wrong_slot_open" ? "bg-coral" : "bg-mint"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {friendlyEventTitle(event)}
                </p>
                <p className="mt-1 truncate text-xs text-ink-soft">
                  {event.medication} · {event.eventTime.slice(-5)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {lastNote && (
        <section className="rounded-lg border border-mint-line bg-mint-soft p-5 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wide text-mint-ink">
            Latest care note
          </p>
          <p className="mt-2 text-sm leading-6 text-ink">{lastNote}</p>
        </section>
      )}
    </aside>
  );
}

function NoteDialog({
  patient,
  onClose,
  onSave,
}: {
  patient: CarePatient;
  onClose: () => void;
  onSave: (note: string) => void;
}) {
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-scrim p-0 sm:items-center sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="care-note-title"
        className="w-full max-w-lg rounded-t-2xl bg-surface p-5 shadow-lift sm:rounded-lg sm:p-6"
      >
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-mint-ink">
              Handoff
            </p>
            <h2
              id="care-note-title"
              className="mt-1 text-xl font-bold text-ink"
            >
              Add a note for {patient.firstName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-cream"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>
        <textarea
          autoFocus
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="What should the family know about today?"
          className="mt-5 min-h-36 w-full resize-none rounded-lg border border-line bg-cream p-4 text-sm leading-6 text-ink outline-none transition placeholder:text-ink-faint focus:border-ink-soft"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-ink-soft hover:bg-cream"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!note.trim()}
            onClick={() => onSave(note.trim())}
            className="rounded-lg bg-action px-4 py-2.5 text-sm font-semibold text-on-action transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save note
          </button>
        </div>
      </section>
    </div>
  );
}

export default function DashboardPanel({
  statuses,
  events,
  schedule,
  analysisTime,
  deviceState,
}: DashboardPanelProps) {
  const [selectedPatientId, setSelectedPatientId] = useState("margaret");
  const [reviewedPatients, setReviewedPatients] = useState<string[]>([]);
  const [reviewedFeedIds, setReviewedFeedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<CareNote[]>([]);
  const [showNoteDialog, setShowNoteDialog] = useState(false);

  const selectedPatient =
    careCircle.find((person) => person.id === selectedPatientId) ??
    careCircle[0];
  const isLivePatient = selectedPatient.id === "margaret";

  const careTasks = useMemo(
    () => buildCareTasks(schedule, statuses, analysisTime),
    [schedule, statuses, analysisTime]
  );

  const liveAttentionCount = careTasks.filter(
    (task) => task.tone === "attention"
  ).length;
  const liveWellbeing: CarePatient["wellbeing"] =
    liveAttentionCount > 0
      ? "attention"
      : careTasks.some((task) => task.tone === "monitor")
        ? "watch"
        : "good";

  const selectedWellbeing = isLivePatient
    ? liveWellbeing
    : selectedPatient.wellbeing;

  const feedItems = useMemo(() => {
    const live: FeedItem[] = careTasks
      .filter(
        (task) =>
          task.tone === "attention" ||
          task.tone === "monitor" ||
          task.tone === "complete"
      )
      .map((task) => {
        const status = statuses.find(
          (entry) => entry.compartment === task.compartment
        );
        const kind: FeedItem["kind"] =
          task.status === "Duplicate Risk"
            ? "duplicate"
            : task.tone === "attention"
              ? "missed"
              : task.tone === "monitor"
                ? "late"
                : "taken";

        const title =
          kind === "duplicate"
            ? `${selectedPatient.firstName}'s ${task.medication} was opened twice`
            : kind === "missed"
              ? `${task.medication} hasn't been opened yet`
              : kind === "late"
                ? `${selectedPatient.firstName} took ${task.medication} late`
                : `${selectedPatient.firstName} took ${task.medication}`;

        return {
          id: `live-${task.compartment}`,
          patientId: "margaret",
          time: status?.firstOpenTime
            ? status.firstOpenTime.slice(-5)
            : task.scheduledTime,
          kind,
          title,
          detail: task.detail,
        };
      });

    const noteItems: FeedItem[] = notes.map((note) => {
      const patient = careCircle.find(
        (person) => person.id === note.patientId
      );
      return {
        id: note.id,
        patientId: note.patientId,
        time: note.time,
        kind: "note",
        title: `You left a care note for ${patient?.firstName ?? "family"}`,
        detail: note.text,
      };
    });

    return [...noteItems, ...live].sort((a, b) =>
      b.time.localeCompare(a.time)
    );
  }, [careTasks, statuses, notes, selectedPatient.firstName]);

  const attentionFeedCount = feedItems.filter(
    (item) =>
      (item.kind === "missed" || item.kind === "duplicate") &&
      !reviewedFeedIds.includes(item.id)
  ).length;

  const attentionPeopleCount =
    (liveAttentionCount > 0 ? 1 : 0) +
    careCircle.filter(
      (person) => person.id !== "margaret" && person.wellbeing === "attention"
    ).length;

  const isSynced = deviceState?.connectionStatus === "connected";

  const latestLiveEvent = events[0];
  const latestEventLabel = isLivePatient
    ? latestLiveEvent
      ? `Last: ${friendlyEventTitle(latestLiveEvent).toLowerCase()} at ${latestLiveEvent.eventTime.slice(-5)}`
      : "No device events yet today"
    : `Last: ${selectedPatient.snapshot.lastEventLabel.toLowerCase()} · ${selectedPatient.snapshot.lastEventTime}`;

  return (
    <div className="space-y-7">
      <section className="rounded-lg border border-line bg-surface px-5 py-4 shadow-card">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                attentionPeopleCount > 0
                  ? "bg-coral-soft text-coral-ink"
                  : "bg-mint-soft text-mint-ink"
              }`}
            >
              {attentionPeopleCount > 0 ? (
                <CircleAlert aria-hidden="true" size={17} />
              ) : (
                <ShieldCheck aria-hidden="true" size={17} />
              )}
            </span>
            <div>
              <p className="text-sm font-bold text-ink">
                {attentionPeopleCount > 0
                  ? `${attentionPeopleCount} ${attentionPeopleCount === 1 ? "person needs" : "people need"} you today`
                  : "Everyone is doing well"}
              </p>
              <p className="text-xs text-ink-soft">
                {attentionFeedCount > 0
                  ? `${attentionFeedCount} unreviewed ${attentionFeedCount === 1 ? "alert" : "alerts"}`
                  : "All alerts reviewed"}
              </p>
            </div>
          </div>

          <div className="hidden h-9 w-px bg-line sm:block" />

          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-deep text-ink-soft">
              <Pill aria-hidden="true" size={17} />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">
                {careTasks.filter((task) => task.tone === "complete" || task.tone === "monitor").length}{" "}
                of {careTasks.length} doses taken
              </p>
              <p className="text-xs text-ink-soft">Margaret&apos;s plan today</p>
            </div>
          </div>

          <div className="hidden h-9 w-px bg-line sm:block" />

          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                isSynced
                  ? "bg-mint-soft text-mint-ink"
                  : "bg-cream-deep text-ink-soft"
              }`}
            >
              <Wifi aria-hidden="true" size={17} />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">
                {isSynced ? "Devices synced" : "Waiting for sync"}
              </p>
              <p className="text-xs text-ink-soft">
                {deviceState?.lastSeenAt
                  ? `Last seen ${deviceState.lastSeenAt.slice(11, 16)}`
                  : "Listening for pillboxes"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <PatientStories
        selectedId={selectedPatientId}
        liveWellbeing={liveWellbeing}
        onSelect={setSelectedPatientId}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.9fr)]">
        <div className="space-y-6">
          <PatientStatusCard
            patient={selectedPatient}
            wellbeing={selectedWellbeing}
            tasks={isLivePatient ? careTasks : null}
            reviewed={reviewedPatients.includes(selectedPatient.id)}
            latestEvent={latestEventLabel}
            onAddNote={() => setShowNoteDialog(true)}
            onMarkReviewed={() =>
              setReviewedPatients((current) =>
                current.includes(selectedPatient.id)
                  ? current.filter((id) => id !== selectedPatient.id)
                  : [...current, selectedPatient.id]
              )
            }
          />

          <CareFeed
            items={feedItems}
            reviewedIds={reviewedFeedIds}
            onReview={(id) =>
              setReviewedFeedIds((current) => [...current, id])
            }
          />
        </div>

        <SummaryRail
          patient={selectedPatient}
          wellbeing={selectedWellbeing}
          events={isLivePatient ? events : []}
          deviceState={deviceState}
          lastNote={notes[0]?.text ?? ""}
        />
      </div>

      <section className="border-t border-line pt-7">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles aria-hidden="true" className="text-coral" size={18} />
          <p className="text-sm font-bold text-ink">
            Smart Pillbox notes for the week
          </p>
        </div>
        <AiReportPanel />
      </section>

      {showNoteDialog && (
        <NoteDialog
          patient={selectedPatient}
          onClose={() => setShowNoteDialog(false)}
          onSave={(text) => {
            setNotes((current) => [
              {
                id: `note-${Date.now()}`,
                patientId: selectedPatient.id,
                time: analysisTime,
                text,
              },
              ...current,
            ]);
            setShowNoteDialog(false);
          }}
        />
      )}
    </div>
  );
}
