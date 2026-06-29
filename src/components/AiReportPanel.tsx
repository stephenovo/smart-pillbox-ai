"use client";

import { useMemo, useState } from "react";
import { sampleHistoricalAdherenceRecords } from "../lib/sampleHistory";
import { generateCaregiverInsightReport } from "../lib/aiCaregiverInsights";

type AiReportSection =
  | "caregiver_summary"
  | "key_insight"
  | "clinic_visit_note";

type AiReportApiResponse = {
  aiSummary?: string;
  model?: string;
  provider?: string;
  section?: AiReportSection;
  error?: string;
};

const reportSections: {
  id: AiReportSection;
  title: string;
  description: string;
}[] = [
  {
    id: "caregiver_summary",
    title: "Overall Summary",
    description: "A short summary of the patient’s weekly adherence pattern.",
  },
  {
    id: "key_insight",
    title: "Insight",
    description: "The most important behaviour pattern caregivers should notice.",
  },
  {
    id: "clinic_visit_note",
    title: "Clinic-Visit Note",
    description: "A concise note for caregiver or clinic review.",
  },
];

function getConcernDotClass(level: string) {
  if (level === "high") return "bg-red-500";
  if (level === "medium") return "bg-amber-400";
  return "bg-emerald-500";
}

function getHeatCellClass(score: number) {
  if (score >= 7) return "bg-red-500";
  if (score >= 4) return "bg-amber-400";
  if (score >= 1) return "bg-emerald-300";
  return "bg-slate-200";
}

export default function AiReportPanel() {
  const [generatedReports, setGeneratedReports] = useState<
    Partial<Record<AiReportSection, string>>
  >({});
  const [loadingSection, setLoadingSection] =
    useState<AiReportSection | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const report = useMemo(
    () =>
      generateCaregiverInsightReport(
        sampleHistoricalAdherenceRecords,
        "patient-001"
      ),
    []
  );

  async function generateSection(section: AiReportSection) {
    setLoadingSection(section);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/caregiver-insight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          report,
          section,
        }),
      });

      const data = (await response.json()) as AiReportApiResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "AI report generation failed.");
      }

      setGeneratedReports((currentReports) => ({
        ...currentReports,
        [section]: data.aiSummary ?? "No AI report was generated.",
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown AI API error.";
      setErrorMessage(message);
    } finally {
      setLoadingSection(null);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            AI Analysis
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            AI Intelligent Data Report
          </h2>
        </div>

        <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
          DeepSeek-powered summary
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          {reportSections.map((section) => {
            const isLoading = loadingSection === section.id;
            const generatedText = generatedReports[section.id];

            return (
              <div
                key={section.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">
                      {section.title}
                    </h3>

                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                      {section.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => generateSection(section.id)}
                    disabled={isLoading}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {isLoading ? "Generating..." : "Generate"}
                  </button>
                </div>

                {generatedText && (
                  <div className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700 shadow-sm">
                    {generatedText}
                  </div>
                )}
              </div>
            );
          })}

          {errorMessage && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">
                Adherence Risk Heatmap
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Visual summary of concern level by medication routine.
              </p>
            </div>

            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              {report.overallConcernLevel}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {report.medicationInsights.map((insight) => (
              <div
                key={insight.compartmentId}
                className="rounded-2xl bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Compartment {insight.compartmentId}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {insight.medicationName}
                    </p>
                  </div>

                  <span
                    className={`h-3 w-3 rounded-full ${getConcernDotClass(
                      insight.concernLevel
                    )}`}
                  />
                </div>

                <div className="mt-4 grid grid-cols-10 gap-1">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <span
                      key={index}
                      className={`h-4 rounded-full ${
                        index < Math.min(10, insight.concernScore)
                          ? getHeatCellClass(insight.concernScore)
                          : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>Concern score: {insight.concernScore}</span>
                  <span className="capitalize">{insight.concernLevel}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              Low
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              Medium
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              High
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}