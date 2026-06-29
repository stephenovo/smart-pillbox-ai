"use client";

import { useEffect, useState } from "react";
import type { MedicationSchedule } from "../types/pillbox";

type InitialisationTableProps = {
  schedule: MedicationSchedule[];
  onScheduleChange: (schedule: MedicationSchedule[]) => void;
  onApplyRecommendedBufferTimes: () => void;
};

function getRecommendedBufferLabel(highRisk: boolean) {
  return highRisk ? "Recommended: 30 min" : "Recommended: 60 min";
}

export function InitialisationTable({
  schedule,
  onScheduleChange,
  onApplyRecommendedBufferTimes,
}: InitialisationTableProps) {
  const [draftSchedule, setDraftSchedule] =
    useState<MedicationSchedule[]>(schedule);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setDraftSchedule(schedule);
  }, [schedule]);

  function updateScheduleItem(
    index: number,
    updates: Partial<MedicationSchedule>
  ) {
    setDraftSchedule((currentSchedule) =>
      currentSchedule.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updates } : item
      )
    );

    setHasUnsavedChanges(true);
  }

  function handleSaveInitialisation() {
    onScheduleChange(draftSchedule);
    setHasUnsavedChanges(false);
  }

  function handleApplyRecommendedBuffers() {
    onApplyRecommendedBufferTimes();
    setHasUnsavedChanges(false);
  }

  return (
    <div className="space-y-6">
        <div
            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                hasUnsavedChanges
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
        >
            {hasUnsavedChanges
                ? "Unsaved changes — save before running the pillbox."
                : "Saved — pillbox setup is up to date."}
        </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {draftSchedule.map((item, index) => (
          <section
            key={item.compartment}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Compartment {item.compartment}
                </p>

                <h4 className="mt-2 text-xl font-bold text-slate-900">
                  {item.medication || "Unnamed medication"}
                </h4>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  item.highRisk
                    ? "bg-red-50 text-red-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {item.highRisk ? "High Risk" : "Normal Risk"}
              </span>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  Medication Name
                </span>

                <input
                  value={item.medication}
                  onChange={(event) =>
                    updateScheduleItem(index, {
                      medication: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  placeholder="e.g. Blood Pressure Medicine"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  Scheduled Time
                </span>

                <input
                  type="time"
                  value={item.scheduledTime}
                  onChange={(event) =>
                    updateScheduleItem(index, {
                      scheduledTime: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Buffer Time
                  </span>

                  <span className="text-xs font-medium text-slate-500">
                    {getRecommendedBufferLabel(item.highRisk)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={item.bufferTimeMinutes}
                    onChange={(event) =>
                      updateScheduleItem(index, {
                        bufferTimeMinutes: Number(event.target.value),
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  />

                  <span className="text-sm text-slate-500">min</span>
                </div>
              </label>

              <div className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  High-Risk Medication
                </span>

                <button
                  type="button"
                  onClick={() =>
                    updateScheduleItem(index, {
                      highRisk: !item.highRisk,
                    })
                  }
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    item.highRisk
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <span>{item.highRisk ? "Enabled" : "Disabled"}</span>
                  <span
                    className={`h-6 w-11 rounded-full p-1 transition ${
                      item.highRisk ? "bg-red-200" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`block h-4 w-4 rounded-full bg-white shadow-sm transition ${
                        item.highRisk ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </span>
                </button>
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-end">
          <button
            type="button"
            onClick={handleApplyRecommendedBuffers}
            className="rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            Apply Recommended Buffer Times
          </button>

          <button
            type="button"
            onClick={handleSaveInitialisation}
            disabled={!hasUnsavedChanges}
            className={`rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm transition ${
                hasUnsavedChanges
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "cursor-default bg-emerald-50 text-emerald-700"
            }`}
            >
            {hasUnsavedChanges ? "Save Initialisation" : "Saved"}
            </button>
        </div>
      </section>
    </div>
  );
}