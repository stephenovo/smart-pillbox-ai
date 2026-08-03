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
                ? "border-honey-line bg-honey-soft text-honey-ink"
                : "border-mint-line bg-mint-soft text-mint-ink"
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
            className="rounded-lg border border-line bg-surface p-5 transition hover:border-ink-faint"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-ink-faint">
                  Compartment {item.compartment}
                </p>

                <h4 className="mt-1 text-lg font-bold text-ink">
                  {item.medication || "Unnamed medication"}
                </h4>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  item.highRisk
                    ? "bg-coral-soft text-coral-ink"
                    : "bg-mint-soft text-mint-ink"
                }`}
              >
                {item.highRisk ? "High Risk" : "Normal Risk"}
              </span>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                    <span className="block text-sm font-semibold text-ink-soft">
                    Medication Name
                    </span>

                    <input
                    value={item.medication}
                    onChange={(event) =>
                        updateScheduleItem(index, {
                        medication: event.target.value,
                        })
                    }
                    className="w-full rounded-md border border-line bg-cream px-4 py-3 text-sm text-ink outline-none transition focus:border-ink-soft focus:bg-surface"
                    placeholder="e.g. Blood Pressure Medicine"
                    />
                </label>

                <label className="space-y-2">
                    <span className="block text-sm font-semibold text-ink-soft">
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
                    className="w-full rounded-md border border-line bg-cream px-4 py-3 text-sm text-ink outline-none transition focus:border-ink-soft focus:bg-surface"
                    />
                </label>

                <label className="space-y-2">
                    <span className="block text-sm font-semibold text-ink-soft">
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
                        className="w-full rounded-md border border-line bg-cream px-4 py-3 text-sm text-ink outline-none transition focus:border-ink-soft focus:bg-surface"
                    />

                    <span className="text-sm text-ink-soft">min</span>
                    </div>
                </label>

                <div className="space-y-2">
                    <span className="block text-sm font-semibold text-ink-soft">
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
                        ? "border-coral-line bg-coral-soft text-coral-ink"
                        : "border-line bg-cream text-ink-soft"
                    }`}
                    >
                    <span>{item.highRisk ? "Enabled" : "Disabled"}</span>

                    <span
                        className={`h-6 w-11 rounded-full p-1 transition ${
                        item.highRisk ? "bg-coral-line" : "bg-line"
                        }`}
                    >
                        <span
                        className={`block h-4 w-4 rounded-full bg-toggle-knob shadow-sm transition ${
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

      <section className="border-t border-line pt-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-end">
          <button
            type="button"
            onClick={handleApplyRecommendedBuffers}
            disabled={saveStatus === "saving"}
            className="rounded-md border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink-soft transition hover:bg-cream-deep"
          >
            Apply Recommended Buffer Times
          </button>

          <button
            type="button"
            onClick={handleSaveInitialisation}
            disabled={!hasUnsavedChanges || saveStatus === "saving"}
            className={`rounded-md px-5 py-3 text-sm font-semibold transition ${
                hasUnsavedChanges
                ? "bg-action text-on-action hover:bg-action-hover"
                : "cursor-default bg-mint-soft text-mint-ink"
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
