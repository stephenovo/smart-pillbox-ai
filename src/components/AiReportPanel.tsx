"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
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
    title: "This week at a glance",
    description: "A short, plain-language recap of Margaret's week.",
  },
  {
    id: "key_insight",
    title: "Something to keep an eye on",
    description: "The one pattern most worth your attention right now.",
  },
  {
    id: "clinic_visit_note",
    title: "For the next clinic visit",
    description: "A tidy note you can bring to Dr. Wong's appointment.",
  },
];

function getConcernDotClass(level: string) {
  if (level === "high") return "bg-coral";
  if (level === "medium") return "bg-honey";
  return "bg-mint";
}

function getHeatCellClass(score: number) {
  if (score >= 7) return "bg-coral";
  if (score >= 4) return "bg-honey";
  if (score >= 1) return "bg-mint";
  return "bg-line";
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
        throw new Error(data.error ?? "The care note couldn't be written.");
      }

      setGeneratedReports((currentReports) => ({
        ...currentReports,
        [section]: data.aiSummary ?? "No note was generated.",
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";
      setErrorMessage(message);
    } finally {
      setLoadingSection(null);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-card sm:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-coral-ink">
            Smart Pillbox insight
          </p>

          <h2 className="mt-1 text-xl font-bold text-ink">
            This week with Margaret
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Gentle notes written from her pillbox activity — no charts required.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-mint-soft px-3 py-1.5 text-xs font-bold text-mint-ink">
          <Sparkles aria-hidden="true" size={13} />
          Written for you
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
                className="rounded-lg border border-line bg-cream p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-ink">
                      {section.title}
                    </h3>

                    <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
                      {section.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => generateSection(section.id)}
                    disabled={isLoading}
                    className="flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Sparkles aria-hidden="true" size={14} />
                    {isLoading
                      ? "Writing…"
                      : generatedText
                        ? "Write again"
                        : "Write this for me"}
                  </button>
                </div>

                {generatedText && (
                  <div className="mt-4 border-t border-line pt-4 text-sm leading-7 text-ink">
                    {generatedText}
                  </div>
                )}
              </div>
            );
          })}

          {errorMessage && (
            <div className="rounded-lg border border-coral-line bg-coral-soft p-4 text-sm text-coral-ink">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-line bg-cream p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-ink">
                Routines that need a little support
              </h3>

              <p className="mt-1 text-sm leading-6 text-ink-soft">
                Each bar is one medication routine — the fuller the bar, the
                more often it&apos;s been tricky lately.
              </p>
            </div>

            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-ink-soft">
              {report.overallConcernLevel}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {report.medicationInsights.map((insight) => (
              <div
                key={insight.compartmentId}
                className="border-b border-line py-4 last:border-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      Compartment {insight.compartmentId}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-ink">
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
                      className={`h-2 rounded-full ${
                        index < Math.min(10, insight.concernScore)
                          ? getHeatCellClass(insight.concernScore)
                          : "bg-line"
                      }`}
                    />
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
                  <span>
                    {insight.concernLevel === "high"
                      ? "Needs attention most days"
                      : insight.concernLevel === "medium"
                        ? "Slips now and then"
                        : "Mostly steady"}
                  </span>
                  <span className="capitalize">{insight.concernLevel}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-xs text-ink-soft">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-mint" />
              Steady
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-honey" />
              Now and then
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-coral" />
              Needs attention
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
