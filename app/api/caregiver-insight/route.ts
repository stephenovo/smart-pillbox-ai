import { NextResponse } from "next/server";
import {
  buildCaregiverInsightApiPrompt,
  type CaregiverInsightReport,
} from "../../../src/lib/aiCaregiverInsights";

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

    const body = await request.json();

    if (!body.report) {
      return NextResponse.json(
        {
          error: "Missing caregiver insight report.",
        },
        { status: 400 }
      );
    }

    const report = body.report as CaregiverInsightReport;
    const userPrompt = buildCaregiverInsightApiPrompt(report);

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
You are the AI Caregiver Insight module inside Smart Pillbox AI.

Your role:
Generate a clear, caregiver-friendly medication adherence summary based only on the structured adherence report.

Hard safety boundaries:
- Do not decide medication schedule.
- Do not decide dosage.
- Do not give prescription advice.
- Do not diagnose the patient.
- Do not claim that a medication is clinically safe or unsafe.
- Do not override caregiver-defined or healthcare-professional-defined settings.
- Do not independently classify a dose as missed, duplicate, safe, or unsafe.
- Do not use the phrase "missed dose". Use "missed medication event" instead.
- Do not use the phrase "duplicate dose". Use "duplicate opening event" instead.
- The structured report comes from the rule-based Medication Safety Control Layer. You only summarise its results.

What you can do:
- Summarise adherence trends.
- Highlight routines that may need caregiver attention.
- Explain missed, delayed, or duplicate opening patterns using plain English.
- Suggest that caregivers or healthcare professionals review high-risk concerns.

Output format:
1. Caregiver Summary
2. Key Concern
3. Clinic-Visit Note
4. Safety Reminder

Writing rules:
- Use plain text only.
- Do not use markdown bold symbols such as **.
- Keep each section short.
- Use "medication event" instead of "dose" when describing missed or delayed records.

Keep the tone professional, concise, and suitable for a healthcare innovation demo.
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