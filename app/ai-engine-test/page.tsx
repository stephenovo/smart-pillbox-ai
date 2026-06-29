"use client";

import { useState } from "react";
import { sampleHistoricalAdherenceRecords } from "../../src/lib/sampleHistory";
import {
  runSmartPillboxAiEngine,
  type SmartPillboxAiEngineResult,
} from "../../src/lib/aiEngine";

type CaregiverInsightApiResponse = {
  aiSummary?: string;
  model?: string;
  provider?: string;
  error?: string;
};

export default function AiEngineTestPage() {
  const [engineResult, setEngineResult] =
    useState<SmartPillboxAiEngineResult | null>(null);
  const [apiResult, setApiResult] =
    useState<CaregiverInsightApiResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);

  function handleRunAiEngine() {
    setErrorMessage(null);
    setApiResult(null);

    const result = runSmartPillboxAiEngine({
      records: sampleHistoricalAdherenceRecords,
      patientId: "patient-001",
      currentReminderScenarios: [
        {
          compartmentId: 1,
          currentDelayMinutes: 30,
          caregiverDefinedBufferMinutes: 60,
        },
        {
          compartmentId: 2,
          currentDelayMinutes: 18,
          caregiverDefinedBufferMinutes: 30,
        },
        {
          compartmentId: 3,
          currentDelayMinutes: 20,
          caregiverDefinedBufferMinutes: 60,
        },
        {
          compartmentId: 4,
          currentDelayMinutes: 42,
          caregiverDefinedBufferMinutes: 60,
        },
      ],
    });

    setEngineResult(result);
  }

  async function handleGenerateDeepSeekSummary() {
    if (!engineResult) {
      setErrorMessage("Please run the AI Engine first.");
      return;
    }

    setIsLoadingApi(true);
    setErrorMessage(null);
    setApiResult(null);

    try {
      const response = await fetch("/api/caregiver-insight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          report: engineResult.caregiverInsightReport,
        }),
      });

      const data = (await response.json()) as CaregiverInsightApiResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "DeepSeek API request failed.");
      }

      setApiResult(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown API error.";
      setErrorMessage(message);
    } finally {
      setIsLoadingApi(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            Smart Pillbox AI
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            AI Engine Test Page
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            This temporary page tests the full AI pipeline: self-learning
            reminder escalation plus DeepSeek-generated caregiver insight
            summary.
          </p>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <strong>Safety boundary:</strong> AI does not decide medication
            schedule, dosage, prescription, missed status, duplicate risk, or
            clinical safety. AI only learns adherence behaviour and summarises
            rule-based event results.
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={handleRunAiEngine}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Run AI Engine
            </button>

            <button
              onClick={handleGenerateDeepSeekSummary}
              disabled={!engineResult || isLoadingApi}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isLoadingApi
                ? "Generating DeepSeek Summary..."
                : "Generate DeepSeek Summary"}
            </button>
          </div>
        </section>

        {errorMessage && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
            <h2 className="text-lg font-semibold">Error</h2>
            <p className="mt-2">{errorMessage}</p>
          </section>
        )}

        {engineResult && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Function 1: Self-Learning Reminder Escalation
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {engineResult.reminderResults.map((result) => (
                <div
                  key={result.recommendation.compartmentId}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">
                        Compartment {result.recommendation.compartmentId}
                      </p>
                      <h3 className="mt-1 font-semibold">
                        {result.recommendation.medicationName}
                      </h3>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {result.recommendation.urgencyLevel}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
                    <p>
                      <strong>Recommendation:</strong>{" "}
                      {result.recommendation.recommendation}
                    </p>
                    <p>
                      <strong>Current delay:</strong>{" "}
                      {result.recommendation.currentDelayMinutes} min
                    </p>
                    <p>
                      <strong>Adaptive threshold:</strong>{" "}
                      {
                        result.recommendation
                          .personalisedThresholdMinutes
                      }{" "}
                      min
                    </p>
                    <p>
                      <strong>Long-term median:</strong>{" "}
                      {result.model.longTermMedianDelayMinutes} min
                    </p>
                    <p>
                      <strong>Recent median:</strong>{" "}
                      {result.model.recentMedianDelayMinutes ?? "Not enough data"}{" "}
                      {result.model.recentMedianDelayMinutes !== null ? "min" : ""}
                    </p>
                    <p>
                      <strong>Learning trend:</strong>{" "}
                      {result.recommendation.learningTrend}
                    </p>
                    <p>
                      <strong>Model version:</strong>{" "}
                      {result.recommendation.modelVersion}
                    </p>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                    {result.recommendation.explanation}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {engineResult && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Function 2: Structured Caregiver Insight Report
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border p-4">
                <p className="text-xs text-slate-500">Records Analysed</p>
                <p className="mt-1 text-2xl font-bold">
                  {engineResult.caregiverInsightReport.totalRecordsAnalysed}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-xs text-slate-500">Missed Events</p>
                <p className="mt-1 text-2xl font-bold">
                  {engineResult.caregiverInsightReport.totalMissedCount}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-xs text-slate-500">Delayed Events</p>
                <p className="mt-1 text-2xl font-bold">
                  {engineResult.caregiverInsightReport.totalDelayedCount}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-xs text-slate-500">Duplicate Openings</p>
                <p className="mt-1 text-2xl font-bold">
                  {
                    engineResult.caregiverInsightReport
                      .totalDuplicateOpeningCount
                  }
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p>
                <strong>Overall concern level:</strong>{" "}
                {engineResult.caregiverInsightReport.overallConcernLevel}
              </p>
              <p>
                <strong>Most concerning medication:</strong>{" "}
                {engineResult.caregiverInsightReport.mostConcerningMedication
                  ?.medicationName ?? "None"}
              </p>
              <p className="mt-2">
                <strong>Structured caregiver summary:</strong>{" "}
                {engineResult.caregiverInsightReport.caregiverSummary}
              </p>
              <p className="mt-2">
                <strong>Clinic-visit summary:</strong>{" "}
                {engineResult.caregiverInsightReport.clinicVisitSummary}
              </p>
            </div>
          </section>
        )}

        {apiResult?.aiSummary && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">
                DeepSeek Caregiver-Friendly Summary
              </h2>

              <p className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                Provider: {apiResult.provider ?? "unknown"} · Model:{" "}
                {apiResult.model ?? "unknown"}
              </p>
            </div>

            <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-900 p-5 text-sm leading-6 text-slate-100">
              {apiResult.aiSummary}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
}