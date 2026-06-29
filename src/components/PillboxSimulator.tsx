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

function getStatusStyle(status: string) {
  if (
    status === "Missed / Very Late" ||
    status === "Opened Too Early" ||
    status === "Duplicate Risk"
    ) {
    return "mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700";
  }

  if (status === "Taken - Delayed") {
    return "mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700";
  }

  if (status === "Taken - On Time") {
    return "mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700";
  }

  return "mt-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600";
}

export function PillboxSimulator({
  schedule,
  events,
  statuses,
  currentSimulatedTime,
  onOpenCompartment,
  onClearEvents,
}: PillboxSimulatorProps) {
  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            1. Smart Pillbox Simulator
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Click a compartment to simulate a switch-sensor opening event.
          </p>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Current simulated opening time: {currentSimulatedTime}
          </p>
        </div>

        <button
          onClick={onClearEvents}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Clear All Opening Records
        </button>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-4">
        {schedule.map((item) => {
          const openingCount = countOpeningEventsForCompartment(
            events,
            item.compartment
          );

          const currentStatus = statuses.find(
            (status) => status.compartment === item.compartment
          );

          const displayStatus =
            currentStatus?.status ??
            (openingCount > 0 ? "Opening recorded" : "No opening record");

          return (
            <div
              key={item.compartment}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-2xl font-bold text-slate-900">
                C{item.compartment}
              </h3>

              <p className="mt-4 font-semibold text-slate-800">
                {item.medication}
              </p>

              <div className="mt-4 space-y-2 text-sm text-slate-500">
                <p>Scheduled: {item.scheduledTime}</p>
                <p>Buffer: {item.bufferTimeMinutes} min</p>
              </div>

              <div
                className={
                  item.highRisk
                    ? "mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800"
                    : "mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800"
                }
              >
                {item.highRisk ? "High-risk medication" : "Normal medication"}
              </div>

              <div className={getStatusStyle(displayStatus)}>
                {displayStatus}
                {openingCount > 0 && (
                  <span className="ml-2 text-xs opacity-75">
                    ({openingCount} opening{openingCount > 1 ? "s" : ""})
                  </span>
                )}
              </div>

              <button
                onClick={() => onOpenCompartment(item)}
                className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Open Compartment {item.compartment}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}