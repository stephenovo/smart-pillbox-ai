"use client";

import type { ComponentProps } from "react";
import { AdherenceOverview } from "./AdherenceOverview";
import AiReportPanel from "./AiReportPanel";
import { EventLog } from "./EventLog";

type DashboardPanelProps = {
  kpis: ComponentProps<typeof AdherenceOverview>["kpis"];
  statuses: ComponentProps<typeof AdherenceOverview>["statuses"];
  events: ComponentProps<typeof EventLog>["events"];
};

type DotStatus = "normal" | "late" | "miss";

const weekDays = [
  { label: "Mon", number: 1 },
  { label: "Tue", number: 2 },
  { label: "Wed", number: 3 },
  { label: "Thu", number: 4 },
  { label: "Fri", number: 5 },
  { label: "Sat", number: 6 },
  { label: "Sun", number: 7 },
];

const weeklyMedicationMatrix: {
  timeSlot: string;
  description: string;
  dots: DotStatus[];
}[] = [
  {
    timeSlot: "Morning",
    description: "AM medication routine",
    dots: ["normal", "normal", "late", "normal", "normal", "normal", "normal"],
  },
  {
    timeSlot: "Noon",
    description: "Midday medication routine",
    dots: ["normal", "late", "miss", "normal", "normal", "late", "normal"],
  },
  {
    timeSlot: "Evening",
    description: "PM medication routine",
    dots: ["normal", "normal", "normal", "late", "normal", "normal", "miss"],
  },
];

function getDotClass(status: DotStatus): string {
  if (status === "normal") {
    return "bg-emerald-500 shadow-[0_0_0_10px_rgba(16,185,129,0.10)]";
  }

  if (status === "late") {
    return "bg-amber-400 shadow-[0_0_0_10px_rgba(251,191,36,0.12)]";
  }

  return "bg-red-500 shadow-[0_0_0_10px_rgba(239,68,68,0.12)]";
}

function getStatusLabel(status: DotStatus): string {
  if (status === "normal") return "Normal";
  if (status === "late") return "Late";
  return "Miss";
}

function valueToSearchText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    return value.map(valueToSearchText).join(" ");
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map(valueToSearchText)
      .join(" ");
  }

  return "";
}

function getEmergencyAlert(statuses: DashboardPanelProps["statuses"]) {
  const searchText = statuses.map(valueToSearchText).join(" ").toLowerCase();

  if (
    searchText.includes("duplicate") ||
    searchText.includes("missed") ||
    searchText.includes("very late")
  ) {
    return {
      level: "Caregiver Alert",
      title: "Caregiver attention recommended",
      message:
        "The dashboard detected a missed, very late, or repeated opening pattern. Please review the medication status and event log.",
      className: "border-red-200 bg-red-50 text-red-900",
      badgeClassName: "bg-red-600 text-white",
    };
  }

  if (searchText.includes("delayed") || searchText.includes("late")) {
    return {
      level: "Second Reminder",
      title: "Second reminder recommended",
      message:
        "Some medication events appear delayed. Continue local reminder and monitor whether caregiver attention becomes necessary.",
      className: "border-amber-200 bg-amber-50 text-amber-900",
      badgeClassName: "bg-amber-500 text-white",
    };
  }

  return null;
}

function WeeklyStatusMatrix() {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Weekly Status
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Medication Status Matrix
          </h2>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
          <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            Normal
          </div>

          <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2">
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            Late
          </div>

          <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            Miss
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="overflow-x-auto">
          <div className="min-w-[720px] rounded-[28px] bg-slate-50 p-5">
            <div className="grid grid-cols-[150px_repeat(7,1fr)] gap-3">
              <div />

              {weekDays.map((day) => (
                <div
                  key={day.label}
                  className="rounded-2xl bg-white px-3 py-3 text-center shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {day.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {day.number}
                  </p>
                </div>
              ))}

              {weeklyMedicationMatrix.map((row) => (
                <div
                  key={row.timeSlot}
                  className="contents"
                >
                  <div className="flex min-h-20 flex-col justify-center rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">
                      {row.timeSlot}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {row.description}
                    </p>
                  </div>

                  {row.dots.map((dot, index) => (
                    <div
                      key={`${row.timeSlot}-${weekDays[index].label}`}
                      className="flex min-h-20 items-center justify-center rounded-2xl bg-white shadow-sm"
                      title={`${row.timeSlot} ${weekDays[index].label}: ${getStatusLabel(
                        dot
                      )}`}
                    >
                      <span
                        className={`h-5 w-5 rounded-full ${getDotClass(dot)}`}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Each dot represents one medication routine status. Green means normal,
          yellow means late, and red means missed.
        </div>
      </div>
    </section>
  );
}

export default function DashboardPanel({
  kpis,
  statuses,
  events,
}: DashboardPanelProps) {
  const emergencyAlert = getEmergencyAlert(statuses);

  return (
    <div className="space-y-6">
      {emergencyAlert && (
        <section
          className={`rounded-3xl border p-6 shadow-sm ${emergencyAlert.className}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
                Reminder Level
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                {emergencyAlert.title}
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6">
                {emergencyAlert.message}
              </p>
            </div>

            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${emergencyAlert.badgeClassName}`}
            >
              {emergencyAlert.level}
            </span>
          </div>
        </section>
      )}

      <WeeklyStatusMatrix />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-6">
            <AdherenceOverview kpis={kpis} statuses={statuses} />

            <EventLog events={events} />
        </div>
        </section>

      <AiReportPanel />

    </div>
  );
}