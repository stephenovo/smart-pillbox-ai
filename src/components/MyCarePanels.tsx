"use client";

import { useMemo } from "react";
import {
  Activity,
  BatteryMedium,
  Check,
  CircleAlert,
  Clock3,
  HeartHandshake,
  Lightbulb,
  Pill,
  ShieldCheck,
  Wifi,
} from "lucide-react";

import type { HardwareDeviceState } from "../types/hardware";
import type {
  DailyMedicationStatus,
  MedicationSchedule,
  OpeningEvent,
} from "../types/pillbox";

type MyCarePanelProps = {
  statuses: DailyMedicationStatus[];
  events: OpeningEvent[];
  schedule: MedicationSchedule[];
  analysisDate: string;
  analysisTime: string;
  deviceState: HardwareDeviceState | null;
};

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function isTaken(status: DailyMedicationStatus | undefined): boolean {
  return Boolean(status);
}

function statusLabel(status: DailyMedicationStatus | undefined, overdue: boolean) {
  if (!status) return overdue ? "Not taken yet" : "Later today";
  if (status.status === "Duplicate Risk") return "Check this dose";
  if (status.status === "Missed / Very Late") return "Taken late";
  if (status.status === "Taken - Delayed") return "Taken a little late";
  if (status.status === "Opened Too Early") return "Taken early";
  return "Taken";
}

function statusTone(status: DailyMedicationStatus | undefined, overdue: boolean) {
  if (!status && overdue) return "bg-coral-soft text-coral-ink";
  if (!status) return "bg-honey-soft text-honey-ink";
  if (status.status === "Duplicate Risk" || status.status === "Missed / Very Late") {
    return "bg-coral-soft text-coral-ink";
  }
  if (status.status === "Taken - Delayed" || status.status === "Opened Too Early") {
    return "bg-honey-soft text-honey-ink";
  }
  return "bg-mint-soft text-mint-ink";
}

function simpleInsight(
  schedule: MedicationSchedule[],
  statuses: DailyMedicationStatus[],
  analysisTime: string
): string {
  const currentMinutes = timeToMinutes(analysisTime);
  const duplicate = statuses.find((status) => status.status === "Duplicate Risk");
  if (duplicate) {
    return `The ${duplicate.medication} compartment opened twice. Before taking another dose, please check with someone you trust.`;
  }

  const overdue = schedule.find((item) => {
    const recorded = statuses.some((status) => status.compartment === item.compartment);
    return !recorded && timeToMinutes(item.scheduledTime) + item.bufferTimeMinutes < currentMinutes;
  });
  if (overdue) {
    return `Your ${overdue.medication} is still waiting in compartment ${overdue.compartment}. Take a look when you are ready.`;
  }

  const delayed = statuses.find((status) => status.status === "Taken - Delayed");
  if (delayed) {
    return `Your ${delayed.medication} was taken a little late today. Keeping the pillbox near breakfast or dinner can make tomorrow easier.`;
  }

  const takenCount = statuses.filter(isTaken).length;
  if (takenCount > 0) {
    return `You are doing well today: ${takenCount} dose${takenCount === 1 ? "" : "s"} recorded. Keep your routine gentle and steady.`;
  }

  return "Your plan is ready for today. We will keep the important things easy to see.";
}

function progressSummary(schedule: MedicationSchedule[], statuses: DailyMedicationStatus[]) {
  const active = schedule.filter((item) => item.medication.trim() !== "");
  const taken = active.filter((item) =>
    statuses.some((status) => status.compartment === item.compartment)
  ).length;
  return { active, taken };
}

function MyCareHeader({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return (
    <div>
      <p className="text-sm font-bold uppercase tracking-wide text-coral-ink">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-base leading-7 text-ink-soft">{detail}</p>
    </div>
  );
}

export function MyCareTodayPanel({ statuses, schedule, analysisTime }: MyCarePanelProps) {
  const { active, taken } = progressSummary(schedule, statuses);
  const currentMinutes = timeToMinutes(analysisTime);
  const nextDose = useMemo(() => {
    const pending = active
      .filter((item) => !statuses.some((status) => status.compartment === item.compartment))
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    return pending.find((item) => timeToMinutes(item.scheduledTime) >= currentMinutes) ?? pending[0] ?? null;
  }, [active, currentMinutes, statuses]);

  return (
    <div className="space-y-8">
      <MyCareHeader
        eyebrow="My Care"
        title="Your day at a glance"
        detail="A calm view of the medicines and reminders that matter today."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-surface p-5 shadow-card sm:p-6">
          <Pill aria-hidden="true" className="text-coral" size={24} />
          <p className="mt-5 text-4xl font-bold text-ink">{taken}</p>
          <p className="mt-1 text-base font-semibold text-ink-soft">of {active.length} doses taken</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-5 shadow-card sm:p-6">
          <Clock3 aria-hidden="true" className="text-honey-ink" size={24} />
          <p className="mt-5 text-4xl font-bold text-ink">{nextDose?.scheduledTime ?? "All done"}</p>
          <p className="mt-1 text-base font-semibold text-ink-soft">{nextDose ? "next reminder" : "for today"}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-5 shadow-card sm:p-6">
          <ShieldCheck aria-hidden="true" className="text-mint-ink" size={24} />
          <p className="mt-5 text-2xl font-bold text-ink">Steady</p>
          <p className="mt-1 text-base font-semibold text-ink-soft">your routine is visible</p>
        </div>
      </section>

      <section className="rounded-lg border border-coral-line bg-coral-soft p-6 shadow-card sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface text-coral-ink">
            <HeartHandshake aria-hidden="true" size={25} />
          </span>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-coral-ink">Next up</p>
            <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
              {nextDose ? nextDose.medication : "You are all set for today"}
            </h2>
            <p className="mt-2 text-lg leading-7 text-ink-soft">
              {nextDose ? `Compartment ${nextDose.compartment} · scheduled for ${nextDose.scheduledTime}` : "Take a moment to enjoy the rest of your day."}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-mint-line bg-mint-soft p-6 shadow-card sm:p-7">
        <div className="flex items-start gap-4">
          <Lightbulb aria-hidden="true" className="mt-1 shrink-0 text-mint-ink" size={24} />
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-mint-ink">Simple AI check-in</p>
            <p className="mt-2 text-lg leading-8 text-ink">{simpleInsight(schedule, statuses, analysisTime)}</p>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-ink-faint">Today</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">Your medicines</h2>
          </div>
          <span className="text-base font-semibold text-ink-soft">{taken} of {active.length}</span>
        </div>
        <div className="mt-4 divide-y divide-line-soft overflow-hidden rounded-lg border border-line bg-surface shadow-card">
          {active.map((item) => {
            const recorded = statuses.find((status) => status.compartment === item.compartment);
            const overdue = !recorded && timeToMinutes(item.scheduledTime) + item.bufferTimeMinutes < currentMinutes;
            return (
              <div key={item.compartment} className="flex items-center gap-4 px-5 py-5 sm:px-6">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${statusTone(recorded, overdue)}`}>
                  {recorded ? <Check aria-hidden="true" size={22} /> : <Clock3 aria-hidden="true" size={22} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold text-ink">{item.medication}</p>
                  <p className="mt-1 text-base text-ink-soft">{item.scheduledTime} · compartment {item.compartment}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-2 text-sm font-bold ${statusTone(recorded, overdue)}`}>
                  {statusLabel(recorded, overdue)}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function MyCareMedicinesPanel({ statuses, schedule, analysisTime }: MyCarePanelProps) {
  const currentMinutes = timeToMinutes(analysisTime);
  const active = schedule.filter((item) => item.medication.trim() !== "");
  return (
    <div className="space-y-8">
      <MyCareHeader eyebrow="My medicines" title="A simple daily plan" detail="Everything is listed in the order you will need it." />
      <section className="rounded-lg border border-line bg-surface shadow-card">
        <div className="border-b border-line-soft px-5 py-5 sm:px-7">
          <p className="text-base font-semibold text-ink-soft">{active.length} medicines in your plan</p>
        </div>
        <div className="divide-y divide-line-soft">
          {active.map((item) => {
            const recorded = statuses.find((status) => status.compartment === item.compartment);
            const overdue = !recorded && timeToMinutes(item.scheduledTime) + item.bufferTimeMinutes < currentMinutes;
            return (
              <article key={item.compartment} className="flex items-center gap-4 px-5 py-6 sm:px-7">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${statusTone(recorded, overdue)}`}>
                  {recorded ? <Check aria-hidden="true" size={24} /> : <Pill aria-hidden="true" size={24} />}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold text-ink">{item.medication}</h2>
                  <p className="mt-1 text-base text-ink-soft">Take at {item.scheduledTime} · compartment {item.compartment}</p>
                </div>
                <span className={`rounded-full px-3 py-2 text-sm font-bold ${statusTone(recorded, overdue)}`}>
                  {statusLabel(recorded, overdue)}
                </span>
              </article>
            );
          })}
        </div>
      </section>
      <section className="flex items-start gap-4 rounded-lg border border-line bg-surface p-6 shadow-card sm:p-7">
        <HeartHandshake aria-hidden="true" className="mt-1 shrink-0 text-coral" size={24} />
        <div>
          <h2 className="text-xl font-bold text-ink">Need to change your plan?</h2>
          <p className="mt-2 text-base leading-7 text-ink-soft">Ask a family member or clinician to help update medicine names and times safely.</p>
        </div>
      </section>
    </div>
  );
}

export function MyCarePillboxPanel({ events, schedule, deviceState }: MyCarePanelProps) {
  const isSynced = deviceState?.connectionStatus === "connected";
  const active = schedule.filter((item) => item.medication.trim() !== "");
  return (
    <div className="space-y-8">
      <MyCareHeader eyebrow="My pillbox" title="Your pillbox is here" detail="A quick, reassuring look at your device and recent openings." />
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-surface p-6 shadow-card">
          <Wifi aria-hidden="true" className={isSynced ? "text-mint-ink" : "text-ink-faint"} size={26} />
          <p className="mt-5 text-xl font-bold text-ink">{isSynced ? "Connected" : "Waiting to connect"}</p>
          <p className="mt-1 text-base text-ink-soft">{deviceState?.lastSeenAt ? `Last seen ${deviceState.lastSeenAt.slice(11, 16)}` : "Keep it near your home Wi-Fi"}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-6 shadow-card">
          <Activity aria-hidden="true" className="text-coral" size={26} />
          <p className="mt-5 text-3xl font-bold text-ink">{events.length}</p>
          <p className="mt-1 text-base text-ink-soft">openings recorded today</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-6 shadow-card">
          <BatteryMedium aria-hidden="true" className="text-honey-ink" size={26} />
          <p className="mt-5 text-xl font-bold text-ink">Ready</p>
          <p className="mt-1 text-base text-ink-soft">Your reminders are set</p>
        </div>
      </section>
      <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
        <div className="border-b border-line-soft px-5 py-5 sm:px-7">
          <h2 className="text-2xl font-bold text-ink">Recent openings</h2>
          <p className="mt-1 text-base text-ink-soft">Most recent activity from your pillbox.</p>
        </div>
        {events.length === 0 ? (
          <p className="px-5 py-8 text-base text-ink-soft sm:px-7">No openings have been recorded yet today.</p>
        ) : (
          <div className="divide-y divide-line-soft">
            {events.slice(0, 6).map((event) => (
              <div key={event.id} className="flex items-center gap-4 px-5 py-5 sm:px-7">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${event.eventType === "wrong_slot_open" ? "bg-coral-soft text-coral-ink" : "bg-mint-soft text-mint-ink"}`}>
                  {event.eventType === "wrong_slot_open" ? <CircleAlert aria-hidden="true" size={22} /> : <Check aria-hidden="true" size={22} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold text-ink">{event.medication}</p>
                  <p className="mt-1 text-base text-ink-soft">Compartment {event.compartment}</p>
                </div>
                <time className="text-base font-semibold text-ink-soft">{event.eventTime.slice(-5)}</time>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="rounded-lg border border-mint-line bg-mint-soft p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <ShieldCheck aria-hidden="true" className="mt-1 shrink-0 text-mint-ink" size={24} />
          <p className="text-lg leading-8 text-ink">Your pillbox shares only the openings needed to keep your routine visible and safe.</p>
        </div>
      </section>
      <p className="text-sm text-ink-faint">{active.length} medicines are currently linked to this device.</p>
    </div>
  );
}
