"use client";

import { useState } from "react";
import {
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  Radio,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import AiReportPanel from "./AiReportPanel";
import { EventLog } from "./EventLog";
import type {
  DailyMedicationStatus,
  DashboardKpi,
  MedicationSchedule,
  OpeningEvent,
  SafetyStatus,
} from "../types/pillbox";

type DashboardPanelProps = {
  kpis: DashboardKpi[];
  statuses: DailyMedicationStatus[];
  events: OpeningEvent[];
  schedule: MedicationSchedule[];
  analysisDate: string;
  analysisTime: string;
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

const careCircle = [
  { name: "Margaret", initials: "ML", active: true, tone: "bg-[#ffe1df] text-rose-800" },
  { name: "David", initials: "DW", active: false, tone: "bg-[#dff4ef] text-teal-800" },
  { name: "Ellen", initials: "EC", active: false, tone: "bg-[#e5e7ff] text-indigo-800" },
];

const weekDays = [
  { label: "M", value: 100, tone: "bg-teal-500" },
  { label: "T", value: 100, tone: "bg-teal-500" },
  { label: "W", value: 75, tone: "bg-amber-400" },
  { label: "T", value: 100, tone: "bg-teal-500" },
  { label: "F", value: 50, tone: "bg-[#ff5c5c]" },
  { label: "S", value: 75, tone: "bg-amber-400" },
  { label: "S", value: 50, tone: "bg-[#ff5c5c]" },
];

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
                ? `${recordedStatus.openingCount} openings recorded. Confirm the dose was not repeated.`
                : `First opening at ${recordedStatus.firstOpenTime}; ${recordedStatus.delayMinutes} min from schedule.`,
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
            detail: `Taken ${recordedStatus.delayMinutes} min after schedule. Keep monitoring.`,
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
          detail: `Opening received at ${recordedStatus.firstOpenTime}.`,
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
          detail: `${minutesPastSchedule} min past schedule with no opening received.`,
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
          detail: "Reminder window is active or approaching.",
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
        detail: "No caregiver action needed yet.",
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

function taskAppearance(tone: CareTaskTone) {
  if (tone === "attention") {
    return {
      dot: "bg-[#ff5c5c]",
      badge: "bg-[#fff1f0] text-[#d93f3f]",
      icon: CircleAlert,
    };
  }
  if (tone === "monitor") {
    return {
      dot: "bg-amber-400",
      badge: "bg-amber-50 text-amber-700",
      icon: Clock3,
    };
  }
  if (tone === "complete") {
    return {
      dot: "bg-teal-500",
      badge: "bg-teal-50 text-teal-700",
      icon: Check,
    };
  }
  if (tone === "due") {
    return {
      dot: "bg-sky-500",
      badge: "bg-sky-50 text-sky-700",
      icon: Clock3,
    };
  }
  return {
    dot: "bg-stone-300",
    badge: "bg-stone-100 text-neutral-500",
    icon: Clock3,
  };
}

function PatientCircle() {
  return (
    <section aria-label="Care circle" className="overflow-x-auto pb-1">
      <div className="flex min-w-max items-start gap-5">
        {careCircle.map((person) => (
          <button
            key={person.name}
            type="button"
            className="group flex w-[68px] flex-col items-center gap-2"
          >
            <span
              className={`flex h-16 w-16 items-center justify-center rounded-full border-2 bg-white p-[3px] transition group-hover:scale-[1.03] ${
                person.active ? "border-[#ff5c5c]" : "border-stone-200"
              }`}
            >
              <span
                className={`flex h-full w-full items-center justify-center rounded-full text-sm font-bold ${person.tone}`}
              >
                {person.initials}
              </span>
            </span>
            <span className="w-full truncate text-center text-xs font-medium text-neutral-700">
              {person.name}
            </span>
          </button>
        ))}

        <button
          type="button"
          className="group flex w-[68px] flex-col items-center gap-2"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-stone-300 bg-white text-neutral-500 transition group-hover:border-neutral-500 group-hover:text-neutral-950">
            <Plus aria-hidden="true" size={20} />
          </span>
          <span className="text-xs font-medium text-neutral-500">Add person</span>
        </button>
      </div>
    </section>
  );
}

function PatientPost({
  analysisDate,
  eventsCount,
  attentionCount,
  completeCount,
  onAddNote,
}: {
  analysisDate: string;
  eventsCount: number;
  attentionCount: number;
  completeCount: number;
  onAddNote: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <header className="flex items-center gap-3 px-4 py-4 sm:px-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ffe1df] text-sm font-bold text-rose-800 ring-2 ring-[#ff5c5c] ring-offset-2 ring-offset-white">
          ML
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold text-neutral-950">
            Margaret Lin
          </h2>
          <p className="truncate text-xs text-neutral-500">
            Active patient · lives independently
          </p>
        </div>
        <button
          type="button"
          aria-label="More patient options"
          title="More options"
          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition hover:bg-stone-100"
        >
          <MoreHorizontal aria-hidden="true" size={21} />
        </button>
      </header>

      <div className="border-y border-stone-100 bg-[#f4f8f7] px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase text-teal-700">
            Today&apos;s care status
          </p>
          <p className="mt-3 text-4xl font-bold text-neutral-950 sm:text-5xl">
            {attentionCount > 0 ? `${attentionCount} to review` : "All on track"}
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-neutral-600">
            {attentionCount > 0
              ? "A recent pillbox pattern needs a quick caregiver check-in."
              : "Every scheduled opening is currently within the expected window."}
          </p>
        </div>

        <div className="mx-auto mt-7 grid max-w-lg grid-cols-3 divide-x divide-stone-300 border-y border-stone-200 py-4 text-center">
          <div>
            <p className="text-xl font-bold text-neutral-950">{completeCount}</p>
            <p className="mt-1 text-xs text-neutral-500">On track</p>
          </div>
          <div>
            <p className="text-xl font-bold text-[#e34747]">{attentionCount}</p>
            <p className="mt-1 text-xs text-neutral-500">Needs care</p>
          </div>
          <div>
            <p className="text-xl font-bold text-neutral-950">{eventsCount}</p>
            <p className="mt-1 text-xs text-neutral-500">Opens</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2">
          <a
            href="tel:+85255550118"
            aria-label="Call Margaret"
            title="Call Margaret"
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 transition hover:bg-stone-100 hover:text-neutral-950"
          >
            <Phone aria-hidden="true" size={20} />
          </a>
          <a
            href="sms:+85255550118"
            aria-label="Message Margaret"
            title="Message Margaret"
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 transition hover:bg-stone-100 hover:text-neutral-950"
          >
            <MessageCircle aria-hidden="true" size={21} />
          </a>
          <button
            type="button"
            onClick={onAddNote}
            className="ml-auto rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Add care note
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-neutral-700">
          <span className="font-bold">Daily check-in</span> Review for {analysisDate}.
          Device activity is synced and ready for handoff.
        </p>
      </div>
    </article>
  );
}

function AlertFeed({ tasks }: { tasks: CareTask[] }) {
  const [reviewed, setReviewed] = useState<number[]>([]);
  const alerts = tasks.filter((task) => task.tone === "attention");

  if (alerts.length === 0) {
    return (
      <section className="rounded-lg border border-stone-200 bg-white p-6 text-center">
        <ShieldCheck className="mx-auto text-teal-600" size={28} />
        <h2 className="mt-3 text-base font-bold text-neutral-950">
          Nothing needs your attention
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          New pillbox events will appear here automatically.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="alerts-heading">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-[#e34747]">
            Needs attention
          </p>
          <h2 id="alerts-heading" className="mt-1 text-lg font-bold text-neutral-950">
            Care alerts
          </h2>
        </div>
        <span className="text-xs font-semibold text-neutral-400">
          {alerts.length} new
        </span>
      </div>

      <div className="space-y-3">
        {alerts.map((task) => {
          const isReviewed = reviewed.includes(task.compartment);

          return (
            <article
              key={`${task.compartment}-${task.status}`}
              className={`rounded-lg border bg-white p-5 transition ${
                isReviewed ? "border-stone-200 opacity-60" : "border-[#ffc8c3]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff1f0] text-[#e34747]">
                  {isReviewed ? <Check size={20} /> : <CircleAlert size={20} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="font-bold text-neutral-950">{task.medication}</h3>
                    <span className="text-xs font-semibold text-neutral-400">
                      {task.scheduledTime} · Slot {task.compartment}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    {isReviewed ? "Reviewed by Sarah for handoff." : task.detail}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-4">
                <a
                  href="sms:+85255550120"
                  className="rounded-md px-3 py-2 text-sm font-semibold text-neutral-600 transition hover:bg-stone-100"
                >
                  Message family
                </a>
                <button
                  type="button"
                  onClick={() =>
                    setReviewed((current) =>
                      current.includes(task.compartment)
                        ? current.filter((id) => id !== task.compartment)
                        : [...current, task.compartment]
                    )
                  }
                  className="ml-auto rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
                >
                  {isReviewed ? "Undo" : "Mark reviewed"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MedicationTimeline({ tasks }: { tasks: CareTask[] }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white">
      <header className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase text-neutral-400">Today</p>
          <h2 className="mt-1 text-lg font-bold text-neutral-950">
            Medication timeline
          </h2>
        </div>
        <button
          type="button"
          aria-label="Open medication plan"
          title="Open plan"
          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition hover:bg-stone-100"
        >
          <ChevronRight aria-hidden="true" size={20} />
        </button>
      </header>

      <div className="divide-y divide-stone-100">
        {tasks.map((task) => {
          const appearance = taskAppearance(task.tone);
          const Icon = appearance.icon;

          return (
            <article
              key={task.compartment}
              className="grid grid-cols-[52px_1fr] gap-3 px-5 py-4 sm:grid-cols-[64px_1fr_auto] sm:items-center"
            >
              <time className="text-sm font-bold text-neutral-950">
                {task.scheduledTime}
              </time>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${appearance.dot}`} />
                  <h3 className="truncate text-sm font-bold text-neutral-900">
                    {task.medication}
                  </h3>
                </div>
                <p className="mt-1 truncate text-xs text-neutral-500">
                  Slot {task.compartment} · {task.detail}
                </p>
              </div>
              <span
                className={`col-start-2 flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold sm:col-start-auto ${appearance.badge}`}
              >
                <Icon aria-hidden="true" size={13} />
                {task.status}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CareSidePanel({
  events,
  analysisTime,
  lastNote,
}: {
  events: OpeningEvent[];
  analysisTime: string;
  lastNote: string;
}) {
  return (
    <aside className="space-y-5 xl:sticky xl:top-28 xl:self-start">
      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffe1df] text-sm font-bold text-rose-800">
            ML
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-bold text-neutral-950">Margaret Lin</h2>
            <p className="truncate text-xs text-neutral-500">79 · Hong Kong</p>
          </div>
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700">
            Online
          </span>
        </div>

        <dl className="mt-5 divide-y divide-stone-100 border-y border-stone-100 text-sm">
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-neutral-500">Primary contact</dt>
            <dd className="font-semibold text-neutral-950">Daughter · Amy</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-neutral-500">Last device sync</dt>
            <dd className="font-semibold text-neutral-950">{analysisTime}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-neutral-500">Care plan</dt>
            <dd className="font-semibold text-neutral-950">4 medications</dd>
          </div>
        </dl>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href="tel:+85255550118"
            className="flex items-center justify-center gap-2 rounded-md border border-stone-200 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-stone-50"
          >
            <Phone aria-hidden="true" size={16} /> Call
          </a>
          <a
            href="sms:+85255550120"
            className="flex items-center justify-center gap-2 rounded-md border border-stone-200 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-stone-50"
          >
            <MessageCircle aria-hidden="true" size={16} /> Family
          </a>
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-neutral-950">7-day rhythm</h2>
          <span className="text-sm font-bold text-teal-700">84%</span>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => (
            <div key={`${day.label}-${index}`} className="text-center">
              <div className="flex h-16 items-end overflow-hidden rounded-sm bg-stone-100">
                <span
                  className={`block w-full ${day.tone}`}
                  style={{ height: `${day.value}%` }}
                />
              </div>
              <p className="mt-2 text-[10px] font-semibold text-neutral-400">
                {day.label}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-neutral-500">
          Evening doses are the most common source of late or missed openings.
        </p>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <Radio aria-hidden="true" className="text-teal-600" size={17} />
          <h2 className="font-bold text-neutral-950">Latest activity</h2>
        </div>
        <div className="mt-4 divide-y divide-stone-100">
          {events.slice(0, 3).map((event) => (
            <div key={event.id} className="flex gap-3 py-3 first:pt-0">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-neutral-800">
                  {event.eventType === "wrong_slot_open"
                    ? `Wrong Slot ${event.compartment} opened`
                    : `Slot ${event.compartment} opened`}
                </p>
                <p className="mt-1 truncate text-xs text-neutral-500">
                  {event.medication} · {event.source} · {event.eventTime.slice(-5)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {lastNote && (
        <section className="rounded-lg border border-[#c8ece4] bg-[#effaf7] p-5">
          <p className="text-xs font-bold uppercase text-teal-700">Latest note</p>
          <p className="mt-2 text-sm leading-6 text-neutral-700">{lastNote}</p>
        </section>
      )}
    </aside>
  );
}

function NoteDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (note: string) => void;
}) {
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/40 p-0 sm:items-center sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="care-note-title"
        className="w-full max-w-lg rounded-t-lg bg-white p-5 shadow-2xl sm:rounded-lg sm:p-6"
      >
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-teal-700">Handoff</p>
            <h2 id="care-note-title" className="mt-1 text-xl font-bold text-neutral-950">
              Add a care note
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition hover:bg-stone-100"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>
        <textarea
          autoFocus
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="What should the next caregiver know?"
          className="mt-5 min-h-36 w-full resize-none rounded-md border border-stone-200 bg-[#fafafa] p-4 text-sm leading-6 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!note.trim()}
            onClick={() => onSave(note.trim())}
            className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save note
          </button>
        </div>
      </section>
    </div>
  );
}

export default function DashboardPanel({
  kpis,
  statuses,
  events,
  schedule,
  analysisDate,
  analysisTime,
}: DashboardPanelProps) {
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [lastNote, setLastNote] = useState("");
  const careTasks = buildCareTasks(schedule, statuses, analysisTime);
  const attentionCount = careTasks.filter(
    (task) => task.tone === "attention"
  ).length;
  const completeCount = careTasks.filter(
    (task) => task.tone === "complete"
  ).length;
  const activeCount = kpis.find((item) => item.label === "Active")?.value ?? schedule.length;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-[#e34747]">
            Your care circle
          </p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-950 sm:text-3xl">
            People you&apos;re looking after
          </h1>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#effaf7] px-3 py-1.5 text-xs font-bold text-teal-700">
          <span className="h-2 w-2 rounded-full bg-teal-500" />
          {activeCount} active medications
        </div>
      </div>

      <PatientCircle />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
        <div className="space-y-6">
          <PatientPost
            analysisDate={analysisDate}
            eventsCount={events.length}
            attentionCount={attentionCount}
            completeCount={completeCount}
            onAddNote={() => setShowNoteDialog(true)}
          />
          <AlertFeed tasks={careTasks} />
          <MedicationTimeline tasks={careTasks} />
        </div>

        <CareSidePanel
          events={events}
          analysisTime={analysisTime}
          lastNote={lastNote}
        />
      </div>

      <EventLog events={events} statuses={statuses} />

      <section className="border-t border-stone-200 pt-7">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles aria-hidden="true" className="text-[#e34747]" size={18} />
          <p className="text-sm font-bold text-neutral-950">Care intelligence</p>
        </div>
        <AiReportPanel />
      </section>

      {showNoteDialog && (
        <NoteDialog
          onClose={() => setShowNoteDialog(false)}
          onSave={(note) => {
            setLastNote(note);
            setShowNoteDialog(false);
          }}
        />
      )}
    </div>
  );
}
