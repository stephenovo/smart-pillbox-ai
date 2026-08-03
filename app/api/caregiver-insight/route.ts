import { NextResponse } from "next/server";
import {
  buildCaregiverInsightApiPrompt,
  generateCaregiverInsightReport,
  type CaregiverInsightReport,
} from "../../../src/lib/aiCaregiverInsights";
import { sampleHistoricalAdherenceRecords } from "../../../src/lib/sampleHistory";

type DeepSeekChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

type AiReportSection =
  | "caregiver_summary"
  | "key_insight"
  | "clinic_visit_note";

function createInsightReport(patientId: string): CaregiverInsightReport {
  return generateCaregiverInsightReport(
    patientId === "margaret" ? sampleHistoricalAdherenceRecords : [],
    patientId
  );
}

function safePatientName(value: unknown): string {
  if (typeof value !== "string") return "Margaret";
  const name = value.replace(/[^\p{L}\p{M}' -]/gu, "").trim().slice(0, 60);
  return name || "the person you care for";
}

function isAiReportSection(value: unknown): value is AiReportSection {
  return (
    value === "caregiver_summary" ||
    value === "key_insight" ||
    value === "clinic_visit_note"
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId")?.trim() || "margaret";
  return NextResponse.json({ report: createInsightReport(patientId) });
}

function getSectionInstruction(section: AiReportSection): string {
  if (section === "caregiver_summary") {
    return `
Only generate section 1: Caregiver Summary.
Summarise the overall adherence pattern in 2-4 short sentences.
Do not include Key Concern, Clinic-Visit Note, or Safety Reminder.
`;
  }

  if (section === "key_insight") {
    return `
Only generate section 2: Key Insight.
Highlight the most important adherence insight for the caregiver.
Focus on missed medication events, delayed medication events, duplicate opening events, worsening trend, or high-risk concerns if present.
Do not include Caregiver Summary, Clinic-Visit Note, or Safety Reminder.
`;
  }

  return `
Only generate section 3: Clinic-Visit Note.
Write a short note that a caregiver could bring to a doctor, nurse, or clinic review.
Do not give medical advice. Do not include Caregiver Summary, Key Concern, or Safety Reminder.
`;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const model = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Missing DEEPSEEK_API_KEY. Please add it to .env.local and restart the development server.",
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as {
      report?: CaregiverInsightReport;
      section?: unknown;
      patientName?: unknown;
    };
    const report = body.report ?? createInsightReport("margaret");
    const section = isAiReportSection(body.section)
      ? body.section
      : "caregiver_summary";
    const patientName = safePatientName(body.patientName);

    const userPrompt = `
    ${buildCaregiverInsightApiPrompt(report)}

    Requested output:
    ${getSectionInstruction(section)}
    `;

    const deepSeekResponse = await fetch(
      "https://api.deepseek.com/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: `
You are Smart Pillbox, a warm care companion for family caregivers.

Your role:
Write a short, natural-language care note about ${patientName}, based only on the structured adherence report — the way a thoughtful nurse would write to a family member.

Hard safety boundaries:
- Do not decide medication schedule.
- Do not decide dosage.
- Do not give prescription advice.
- Do not diagnose the patient.
- Do not claim that a medication is clinically safe or unsafe.
- Do not override caregiver-defined or healthcare-professional-defined settings.
- Do not independently classify a dose as missed, duplicate, safe, or unsafe.
- The structured report comes from the rule-based Medication Safety Control Layer. You only summarise its results.

What you can do:
- Summarise adherence trends.
- Highlight routines that may need caregiver attention.
- Explain missed, delayed, or duplicate opening patterns using plain English.
- Suggest that caregivers or healthcare professionals review high-risk concerns.

Output rules:
- Generate only the requested section.
- Use plain text only.
- Do not use markdown bold symbols such as **.
- Keep it short — 2 to 4 sentences.
- Write like a warm personal note, not a technical report: say "${patientName}" instead of "the patient", "opened the compartment" instead of "medication event".
- Reassure first, then point out what needs attention. Never alarmist.

Keep the tone warm, calm, and human — like a note from someone who knows the family.
`,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
          thinking: {
            type: "disabled",
          },
          temperature: 0.3,
          stream: false,
        }),
      }
    );

    const data =
      (await deepSeekResponse.json()) as DeepSeekChatCompletionResponse;

    if (!deepSeekResponse.ok) {
      return NextResponse.json(
        {
          error:
            data.error?.message ??
            "DeepSeek API request failed. Please check your API key, model name, or account balance.",
        },
        { status: deepSeekResponse.status }
      );
    }

    const aiSummary =
      data.choices?.[0]?.message?.content ??
      "No AI caregiver summary was generated.";

    return NextResponse.json({
      aiSummary,
      model,
      provider: "deepseek",
      section,
      report,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown DeepSeek API error.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
