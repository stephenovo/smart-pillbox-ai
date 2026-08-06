"use client";

import { useMemo, useState } from "react";
import { sampleHistoricalAdherenceRecords } from "../lib/sampleHistory";
import { runSmartPillboxAiEngine } from "../lib/aiEngine";
import type { CaregiverInsightReport } from "../lib/aiCaregiverInsights";

type CaregiverInsightApiResponse = {
  aiSummary?: string;
  model?: string;
  provider?: string;
  error?: string;
};

function formatRecommendationLabel(recommendation: string): string {
  return recommendation
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function AiFeaturePanel() {
  const [apiResult, setApiResult] =
    useState<CaregiverInsightApiResponse | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const aiEngineResult = useMemo(() => {
    return runSmartPillboxAiEngine({
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
  }, []);

  async function generateDeepSeekSummary(report: CaregiverInsightReport) {
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
          report,
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
    <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            AI Feature
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            AI Adherence Intelligence
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            The AI learns medication response habits, recommends reminder
            escalation levels, and generates caregiver-friendly adherence
            insights. It does not decide schedule, dosage, prescription, or
            clinical safety.
          </p>
        </div>

        <button
          onClick={() =>
            generateDeepSeekSummary(aiEngineResult.caregiverInsightReport)
          }
          disabled={isLoadingApi}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isLoadingApi ? "Generating..." : "Generate AI Report"}
        </button>
      </div>

      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <strong>Safety boundary:</strong> The rule-based Medication Safety
        Control Layer classifies medication events. The AI layer only learns
        adherence habits and summarises patterns for caregivers.
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900">
            Function 1: Self-Learning Reminder Escalation
          </h3>

          <div className="mt-4 space-y-3">
            {aiEngineResult.reminderResults.map((result) => (
              <div
                key={result.recommendation.compartmentId}
                className="rounded-xl bg-slate-50 p-4 text-sm leading-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      Compartment {result.recommendation.compartmentId}
                    </p>

                    <p className="font-semibold text-slate-900">
                      {result.recommendation.medicationName}
                    </p>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {result.recommendation.urgencyLevel}
                  </span>
                </div>

                <p className="mt-3">
                  <strong>Recommendation:</strong>{" "}
                  {formatRecommendationLabel(
                    result.recommendation.recommendation
                  )}
                </p>

                <p>
                  <strong>Current delay:</strong>{" "}
                  {result.recommendation.currentDelayMinutes} min
                </p>

                <p>
                  <strong>AI threshold:</strong>{" "}
                  {result.recommendation.personalisedThresholdMinutes} min
                </p>

                <p>
                  <strong>Learning trend:</strong>{" "}
                  {result.recommendation.learningTrend}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900">
            Function 2: Caregiver Insight & Trend Report
          </h3>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Records Analysed</p>
              <p className="mt-1 text-2xl font-bold">
                {aiEngineResult.caregiverInsightReport.totalRecordsAnalysed}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Concern Level</p>
              <p className="mt-1 text-2xl font-bold capitalize">
                {aiEngineResult.caregiverInsightReport.overallConcernLevel}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Missed Events</p>
              <p className="mt-1 text-2xl font-bold">
                {aiEngineResult.caregiverInsightReport.totalMissedCount}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Duplicate Openings</p>
              <p className="mt-1 text-2xl font-bold">
                {
                  aiEngineResult.caregiverInsightReport
                    .totalDuplicateOpeningCount
                }
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            <p>
              <strong>Most concerning medication:</strong>{" "}
              {aiEngineResult.caregiverInsightReport.mostConcerningMedication
                ?.medicationName ?? "None"}
            </p>

            <p className="mt-2">
              {aiEngineResult.caregiverInsightReport.caregiverSummary}
            </p>
          </div>

          {errorMessage && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {errorMessage}
            </div>
          )}

          {apiResult?.aiSummary && (
            <div className="mt-4 rounded-xl bg-slate-900 p-4 text-sm leading-6 text-slate-100">
              <p className="mb-2 text-xs text-slate-400">
                Provider: {apiResult.provider ?? "unknown"} · Model:{" "}
                {apiResult.model ?? "unknown"}
              </p>

              <pre className="whitespace-pre-wrap font-sans">
                {apiResult.aiSummary}
              </pre>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}