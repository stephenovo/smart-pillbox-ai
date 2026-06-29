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

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const weeklyMedicationMatrix: {
  timeSlot: string;
  dots: DotStatus[];
}[] = [
  {
    timeSlot: "Morning",
    dots: ["normal", "normal", "late", "normal", "normal", "normal", "normal"],
  },
  {
    timeSlot: "Noon",
    dots: ["normal", "late", "miss", "normal", "normal", "late", "normal"],
  },
  {
    timeSlot: "Evening",
    dots: ["normal", "normal", "normal", "late", "normal", "normal", "miss"],
  },
];

function getDotClass(status: DotStatus): string {
  if (status === "normal") return "bg-emerald-500 shadow-emerald-100";
  if (status === "late") return "bg-amber-400 shadow-amber-100";
  return "bg-red-500 shadow-red-100";
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
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Weekly Status
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Medication Status Matrix
          </h2>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            Normal
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            Late
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            Miss
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[640px] rounded-3xl bg-slate-50 p-5">
          <div className="grid grid-cols-[120px_repeat(7,1fr)] items-center gap-4">
            <div />

            {weekDays.map((day, index) => (
              <div
                key={day}
                className="text-center text-sm font-semibold text-slate-500"
              >
                {day}
                <span className="ml-1 text-xs text-slate-400">
                  {index + 1}
                </span>
              </div>
            ))}

            {weeklyMedicationMatrix.map((row) => (
              <>
                <div
                  key={`${row.timeSlot}-label`}
                  className="text-sm font-semibold text-slate-700"
                >
                  {row.timeSlot}
                </div>

                {row.dots.map((dot, index) => (
                  <div
                    key={`${row.timeSlot}-${weekDays[index]}`}
                    className="flex justify-center"
                  >
                    <span
                      className={`h-5 w-5 rounded-full shadow-[0_0_0_8px] ${getDotClass(
                        dot
                      )}`}
                    />
                  </div>
                ))}
              </>
            ))}
          </div>
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
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Caregiver Dashboard
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Adherence Overview
          </h2>
        </div>

        <div className="space-y-6">
          <AdherenceOverview kpis={kpis} statuses={statuses} />

          <EventLog events={events} />
        </div>
      </section>

      <AiReportPanel />
      
    </div>
  );
}