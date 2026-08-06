"use client";

import { useMemo, useState } from "react";
import {
  sampleHistoricalAdherenceRecords,
  type HistoricalAdherenceRecord,
} from "../../src/lib/sampleHistory";
import { runSmartPillboxAiEngine } from "../../src/lib/aiEngine";

function createNewLearningRecord(params: {
  id: string;
  date: string;
  delayMinutes: number;
}): HistoricalAdherenceRecord {
  return {
    id: params.id,
    patientId: "patient-001",
    date: params.date,
    compartmentId: 1,
    medicationName: "Morning Blood Pressure Medicine",
    scheduledTime: "08:00",
    actualOpenTime: `08:${String(params.delayMinutes).padStart(2, "0")}`,
    delayMinutes: params.delayMinutes,
    ruleBasedStatus:
      params.delayMinutes <= 15 ? "taken_on_time" : "taken_delayed",
    highRisk: false,
  };
}

export default function AiLearningTestPage() {
  const [records, setRecords] = useState<HistoricalAdherenceRecord[]>(
    sampleHistoricalAdherenceRecords
  );

  const engineResult = useMemo(() => {
    return runSmartPillboxAiEngine({
      records,
      patientId: "patient-001",
      currentReminderScenarios: [
        {
          compartmentId: 1,
          currentDelayMinutes: 22,
          caregiverDefinedBufferMinutes: 60,
        },
      ],
    });
  }, [records]);

  const result = engineResult.reminderResults[0];

  function addSlowerRecord() {
    const newRecord = createNewLearningRecord({
      id: `learn-slow-${records.length + 1}`,
      date: `2026-06-${String(records.length + 1).padStart(2, "0")}`,
      delayMinutes: 36,
    });

    setRecords((currentRecords) => [...currentRecords, newRecord]);
  }

  function addFastRecord() {
    const newRecord = createNewLearningRecord({
      id: `learn-fast-${records.length + 1}`,
      date: `2026-06-${String(records.length + 1).padStart(2, "0")}`,
      delayMinutes: 6,
    });

    setRecords((currentRecords) => [...currentRecords, newRecord]);
  }

  function resetLearningHistory() {
    setRecords(sampleHistoricalAdherenceRecords);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            Smart Pillbox AI
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Self-Learning AI Test
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            This page shows how the AI updates its reminder escalation logic
            when new adherence behaviour is added to the learning history.
          </p>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <strong>Safety boundary:</strong> The AI does not change medication
            schedule, dosage, or prescription. It only learns the user&apos;s
            response-delay pattern and updates reminder escalation advice within
            caregiver-defined limits.
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={addSlowerRecord}
              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Add Slower Response Record
            </button>

            <button
              onClick={addFastRecord}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Add Fast Response Record
            </button>

            <button
              onClick={resetLearningHistory}
              className="rounded-xl bg-slate-700 px-5 py-3 text-sm font-semibold text-white"
            >
              Reset Learning History
            </button>
          </div>
        </section>

        {result && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Learned Reminder Escalation Result
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border p-4">
                <p className="text-xs text-slate-500">Learning Records</p>
                <p className="mt-1 text-2xl font-bold">
                  {result.model.learnedRecordCount}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-xs text-slate-500">Learning Trend</p>
                <p className="mt-1 text-2xl font-bold">
                  {result.model.learningTrend}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-xs text-slate-500">Recommendation</p>
                <p className="mt-1 text-lg font-bold">
                  {result.recommendation.recommendation}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6">
                <p>
                  <strong>Medication:</strong>{" "}
                  {result.recommendation.medicationName}
                </p>
                <p>
                  <strong>Current delay:</strong>{" "}
                  {result.recommendation.currentDelayMinutes} min
                </p>
                <p>
                  <strong>Long-term median delay:</strong>{" "}
                  {result.model.longTermMedianDelayMinutes} min
                </p>
                <p>
                  <strong>Recent median delay:</strong>{" "}
                  {result.model.recentMedianDelayMinutes ?? "Not enough data"}
                  {result.model.recentMedianDelayMinutes !== null ? " min" : ""}
                </p>
                <p>
                  <strong>Trend change:</strong>{" "}
                  {result.model.trendChangeMinutes ?? "Not enough data"}
                  {result.model.trendChangeMinutes !== null ? " min" : ""}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6">
                <p>
                  <strong>Caregiver buffer:</strong>{" "}
                  {result.threshold.caregiverDefinedBufferMinutes} min
                </p>
                <p>
                  <strong>AI adaptive threshold:</strong>{" "}
                  {result.threshold.personalisedThresholdMinutes} min
                </p>
                <p>
                  <strong>Urgency level:</strong>{" "}
                  {result.recommendation.urgencyLevel}
                </p>
                <p>
                  <strong>Model version:</strong>{" "}
                  {result.recommendation.modelVersion}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
              {result.recommendation.explanation}
            </div>
          </section>
        )}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">What to Try</h2>

          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            <p>
              1. First observe the original AI recommendation.
            </p>
            <p>
              2. Click <strong>Add Slower Response Record</strong>. The recent
              median delay should increase, and the learning trend may become
              worsening.
            </p>
            <p>
              3. Click <strong>Add Fast Response Record</strong>. The model will
              update again based on the new behaviour.
            </p>
            <p>
              4. Watch the model version change after each new record. This
              shows the AI is updating from new adherence data.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}