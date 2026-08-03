"use client";

import { useState } from "react";
import type { MedicationSchedule } from "../types/pillbox";

type InitialisationTableProps = {
  schedule: MedicationSchedule[];
  onScheduleChange: (schedule: MedicationSchedule[]) => void | Promise<void>;
  onApplyRecommendedBufferTimes: () => void | Promise<void>;
};

export function InitialisationTable({
  schedule,
  onScheduleChange,
  onApplyRecommendedBufferTimes,
}: InitialisationTableProps) {
  const [draftSchedule, setDraftSchedule] =
    useState<MedicationSchedule[]>(schedule);
  const [previousSchedule, setPreviousSchedule] =
    useState<MedicationSchedule[]>(schedule);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">(
    "idle"
  );

  if (previousSchedule !== schedule) {
    setPreviousSchedule(schedule);
    setDraftSchedule(schedule);
    setHasUnsavedChanges(false);
  }

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
    setSaveStatus("idle");
  }

  async function handleSaveInitialisation() {
    setSaveStatus("saving");

    try {
      await onScheduleChange(draftSchedule);
      setHasUnsavedChanges(false);
      setSaveStatus("idle");
    } catch {
      setSaveStatus("error");
    }
  }

  async function handleApplyRecommendedBuffers() {
    setSaveStatus("saving");

    try {
      await onApplyRecommendedBufferTimes();
      setHasUnsavedChanges(false);
      setSaveStatus("idle");
    } catch {
      setSaveStatus("error");
    }
  }

  return (
    <div className="space-y-6">
        <div
            className={`rounded-md border px-4 py-3 text-sm font-medium ${
                hasUnsavedChanges
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-teal-200 bg-teal-50 text-teal-900"
            }`}
        >
            {saveStatus === "error"
                ? "Save failed - please try again."
                : hasUnsavedChanges
                  ? "Unsaved changes - save to update Margaret's pillbox."
                  : "Saved - Margaret's pillbox is up to date."}
        </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {draftSchedule.map((item, index) => (
          <section
            key={item.compartment}
            className="rounded-lg border border-stone-200 bg-white p-5 transition hover:border-stone-300"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-neutral-400">
                  Compartment {item.compartment}
                </p>

                <h4 className="mt-1 text-lg font-bold text-neutral-950">
                  {item.medication || "Unnamed medication"}
                </h4>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  item.highRisk
                    ? "bg-[#fff1f0] text-[#d93f3f]"
                    : "bg-teal-50 text-teal-700"
                }`}
              >
                {item.highRisk ? "High Risk" : "Normal Risk"}
              </span>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                    <span className="block text-sm font-semibold text-slate-700">
                    Medication Name
                    </span>

                    <input
                    value={item.medication}
                    onChange={(event) =>
                        updateScheduleItem(index, {
                        medication: event.target.value,
                        })
                    }
                    className="w-full rounded-md border border-stone-200 bg-[#fafafa] px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-500 focus:bg-white"
                    placeholder="e.g. Blood Pressure Medicine"
                    />
                </label>

                <label className="space-y-2">
                    <span className="block text-sm font-semibold text-slate-700">
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
                    className="w-full rounded-md border border-stone-200 bg-[#fafafa] px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-500 focus:bg-white"
                    />
                </label>

                <label className="space-y-2">
                    <span className="block text-sm font-semibold text-slate-700">
                    Buffer Time
                    </span>

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
                        className="w-full rounded-md border border-stone-200 bg-[#fafafa] px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-500 focus:bg-white"
                    />

                    <span className="text-sm text-slate-500">min</span>
                    </div>
                </label>

                <div className="space-y-2">
                    <span className="block text-sm font-semibold text-slate-700">
                    High-Risk Medication
                    </span>

                    <button
                    type="button"
                    onClick={() =>
                        updateScheduleItem(index, {
                        highRisk: !item.highRisk,
                        })
                    }
                    className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-sm font-semibold transition ${
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

      <section className="border-t border-stone-200 pt-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-end">
          <button
            type="button"
            onClick={handleApplyRecommendedBuffers}
            disabled={saveStatus === "saving"}
            className="rounded-md border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-stone-50"
          >
            Apply Recommended Buffer Times
          </button>

          <button
            type="button"
            onClick={handleSaveInitialisation}
            disabled={!hasUnsavedChanges || saveStatus === "saving"}
            className={`rounded-md px-5 py-3 text-sm font-semibold transition ${
                hasUnsavedChanges
                ? "bg-neutral-950 text-white hover:bg-neutral-800"
                : "cursor-default bg-teal-50 text-teal-700"
            }`}
            >
            {saveStatus === "saving"
              ? "Saving..."
              : hasUnsavedChanges
                ? "Save medication plan"
                : "Saved"}
            </button>
        </div>
      </section>
    </div>
  );
}
