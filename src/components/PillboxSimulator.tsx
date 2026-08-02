"use client";

import { countOpeningEventsForCompartment } from "../lib/hardwareSimulation";
import type {
  DailyMedicationStatus,
  MedicationSchedule,
  OpeningEvent,
} from "../types/pillbox";

type PillboxSimulatorProps = {
  schedule: MedicationSchedule[];
  events: OpeningEvent[];
  statuses: DailyMedicationStatus[];
  currentSimulatedTime: string;
  onOpenCompartment: (item: MedicationSchedule) => void;
  onClearEvents: () => void;
};

type StatusTone = {
  label: string;
  panelClassName: string;
  badgeClassName: string;
  dotClassName: string;
  railClassName: string;
};

function getStatusTone(status: string): StatusTone {
  if (
    status === "Missed / Very Late" ||
    status === "Opened Too Early" ||
    status === "Duplicate Risk"
    ) {
    return {
      label: "Attention",
      panelClassName: "border-red-200 bg-red-50",
      badgeClassName: "bg-red-600 text-white",
      dotClassName: "bg-red-500",
      railClassName: "bg-red-500",
    };
  }

  if (status === "Taken - Delayed") {
    return {
      label: "Delayed",
      panelClassName: "border-amber-200 bg-amber-50",
      badgeClassName: "bg-amber-500 text-white",
      dotClassName: "bg-amber-400",
      railClassName: "bg-amber-400",
    };
  }

  if (status === "Taken - On Time") {
    return {
      label: "Recorded",
      panelClassName: "border-emerald-200 bg-emerald-50",
      badgeClassName: "bg-emerald-600 text-white",
      dotClassName: "bg-emerald-500",
      railClassName: "bg-emerald-500",
    };
  }

  return {
    label: "Ready",
    panelClassName: "border-slate-200 bg-slate-50",
    badgeClassName: "bg-slate-200 text-slate-700",
    dotClassName: "bg-slate-300",
    railClassName: "bg-slate-300",
  };
}

function getDisplayStatus(
  openingCount: number,
  status?: DailyMedicationStatus
): string {
  return status?.status ?? (openingCount > 0 ? "Opening recorded" : "Ready");
}

export function PillboxSimulator({
  schedule,
  events,
  statuses,
  currentSimulatedTime,
  onOpenCompartment,
  onClearEvents,
}: PillboxSimulatorProps) {
  const activeCompartmentCount = schedule.length;
  const highRiskCount = schedule.filter((item) => item.highRisk).length;
  const lastEvent = events[0];
  const riskStatusCount = statuses.filter(
    (item) =>
      item.status === "Missed / Very Late" ||
      item.status === "Opened Too Early" ||
      item.status === "Duplicate Risk"
  ).length;

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Pillbox
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              Smart Pillbox Simulator
            </h2>
          </div>

          <button
            onClick={onClearEvents}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            Clear Records
          </button>
        </div>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-3xl bg-slate-950 p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Device Status
                </p>
                <h3 className="mt-2 text-xl font-semibold">
                  8-compartment unit
                </h3>
              </div>

              <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-bold text-slate-950">
                Online
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs text-slate-300">Active meds</p>
                <p className="mt-2 text-2xl font-bold">
                  {activeCompartmentCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs text-slate-300">High risk</p>
                <p className="mt-2 text-2xl font-bold">
                  {highRiskCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs text-slate-300">Openings</p>
                <p className="mt-2 text-2xl font-bold">
                  {events.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs text-slate-300">Alerts</p>
                <p className="mt-2 text-2xl font-bold">
                  {riskStatusCount}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Simulated time
              </p>
              <p className="mt-2 text-lg font-semibold">
                {currentSimulatedTime}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Latest event
            </p>
            {lastEvent ? (
              <div className="mt-4 space-y-2">
                <p className="text-lg font-semibold text-slate-950">
                  C{lastEvent.compartment} opened
                </p>
                <p className="text-sm text-slate-600">
                  {lastEvent.medication}
                </p>
                <p className="text-sm font-medium text-slate-500">
                  {lastEvent.eventTime}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-slate-500">
                No opening event recorded in this session.
              </p>
            )}
          </div>
        </aside>

        <div className="rounded-[28px] border border-slate-200 bg-slate-100 p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {schedule.map((item) => {
              const openingCount = countOpeningEventsForCompartment(
                events,
                item.compartment
              );

              const currentStatus = statuses.find(
                (status) => status.compartment === item.compartment
              );

              const displayStatus = getDisplayStatus(
                openingCount,
                currentStatus
              );
              const tone = getStatusTone(displayStatus);

              return (
                <article
                  key={item.compartment}
                  className={`relative flex min-h-[320px] flex-col overflow-hidden rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tone.panelClassName}`}
                >
                  <span
                    className={`absolute inset-x-0 top-0 h-1.5 ${tone.railClassName}`}
                  />

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Compartment
                      </p>
                      <h3 className="mt-1 text-3xl font-bold text-slate-950">
                        C{item.compartment}
                      </h3>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${tone.badgeClassName}`}
                    >
                      {tone.label}
                    </span>
                  </div>

                  <div className="mt-5 min-h-[76px]">
                    <p className="text-lg font-semibold leading-6 text-slate-900">
                      {item.medication}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-2xl bg-white/80 px-3 py-2">
                        <p className="text-xs text-slate-400">Scheduled</p>
                        <p className="mt-1 font-semibold text-slate-800">
                          {item.scheduledTime}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/80 px-3 py-2">
                        <p className="text-xs text-slate-400">Buffer</p>
                        <p className="mt-1 font-semibold text-slate-800">
                          {item.bufferTimeMinutes} min
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-4 py-3 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone.dotClassName}`}
                      />
                      <span className="truncate font-semibold text-slate-800">
                        {displayStatus}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-slate-500">
                      {openingCount} open{openingCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="mt-3 rounded-2xl bg-white/80 px-4 py-3 text-sm font-medium text-slate-700">
                    {item.highRisk ? "High-risk medication" : "Normal medication"}
                  </div>

                  <button
                    onClick={() => onOpenCompartment(item)}
                    className="mt-auto w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
                  >
                    Open C{item.compartment}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
