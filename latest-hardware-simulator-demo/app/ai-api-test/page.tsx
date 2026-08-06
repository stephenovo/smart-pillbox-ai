"use client";

import { useState } from "react";
import { sampleHistoricalAdherenceRecords } from "../../src/lib/sampleHistory";
import {
  generateCaregiverInsightReport,
  type CaregiverInsightReport,
} from "../../src/lib/aiCaregiverInsights";

type CaregiverInsightApiResponse = {
  aiSummary?: string;
  model?: string;
  provider?: string;
  error?: string;
};

export default function AiApiTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<CaregiverInsightReport | null>(null);
  const [apiResult, setApiResult] =
    useState<CaregiverInsightApiResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleGenerateAiSummary() {
    setIsLoading(true);
    setErrorMessage(null);
    setApiResult(null);

    const generatedReport = generateCaregiverInsightReport(
      sampleHistoricalAdherenceRecords,
      "patient-001"
    );

    setReport(generatedReport);

    try {
      const response = await fetch("/api/caregiver-insight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          report: generatedReport,
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
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Smart Pillbox AI
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            DeepSeek Caregiver Insight API Test
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            This temporary page tests whether the AI Caregiver Insight module can
            send a structured adherence report to the server-side API route and
            receive a caregiver-friendly summary from DeepSeek.
          </p>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Safety boundary:</strong> The API only summarises adherence
            trends. It does not decide medication schedule, dosage,
            prescription, missed dose status, duplicate risk, or clinical
            safety.
          </div>

          <button
            onClick={handleGenerateAiSummary}
            disabled={isLoading}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isLoading ? "Generating AI Summary..." : "Generate AI Summary"}
          </button>
        </section>

        {errorMessage && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
            <h2 className="text-lg font-semibold">API Error</h2>
            <p className="mt-2">{errorMessage}</p>
          </section>
        )}

        {apiResult?.aiSummary && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">DeepSeek AI Summary</h2>
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

        {report && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Structured Report Sent to API</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border p-4">
                <p className="text-xs text-slate-500">Records Analysed</p>
                <p className="mt-1 text-2xl font-bold">
                  {report.totalRecordsAnalysed}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-xs text-slate-500">Missed Events</p>
                <p className="mt-1 text-2xl font-bold">
                  {report.totalMissedCount}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-xs text-slate-500">Delayed Events</p>
                <p className="mt-1 text-2xl font-bold">
                  {report.totalDelayedCount}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-xs text-slate-500">Duplicate Openings</p>
                <p className="mt-1 text-2xl font-bold">
                  {report.totalDuplicateOpeningCount}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p>
                <strong>Overall concern level:</strong>{" "}
                {report.overallConcernLevel}
              </p>
              <p>
                <strong>Most concerning medication:</strong>{" "}
                {report.mostConcerningMedication?.medicationName ?? "None"}
              </p>
              <p className="mt-2">
                <strong>Structured caregiver summary:</strong>{" "}
                {report.caregiverSummary}
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}