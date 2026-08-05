import type { AdherenceFeatureSnapshot } from "./adherenceFeatures";

export type AdherenceModelPrediction = {
  modelSource: "synthetic";
  modelVersion: string;
  riskProbability: number;
  behaviourChangeProbability: number;
};

export async function predictAdherenceRisk(
  features: AdherenceFeatureSnapshot
): Promise<AdherenceModelPrediction> {
  const baseUrl =
    process.env.ADHERENCE_MODEL_URL?.replace(/\/$/, "") ??
    "http://127.0.0.1:8010";
  const response = await fetch(`${baseUrl}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ features }),
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  const payload = (await response.json()) as Partial<AdherenceModelPrediction> & {
    error?: string;
  };
  if (
    !response.ok ||
    payload.modelSource !== "synthetic" ||
    typeof payload.modelVersion !== "string" ||
    typeof payload.riskProbability !== "number" ||
    typeof payload.behaviourChangeProbability !== "number"
  ) {
    throw new Error(payload.error || "The adherence model returned an invalid response.");
  }
  return payload as AdherenceModelPrediction;
}
