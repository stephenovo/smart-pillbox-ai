import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildAdherenceFeatureSnapshot } from "./adherenceFeatures";
import { predictAdherenceRisk } from "./adherenceModelClient";
import { addShadowDecision, getShadowDecisions } from "./adherenceShadowStore";
import type {
  HardwarePlanSlot,
  HardwareShadowDecision,
} from "../types/hardware";
import type { OpeningEvent } from "../types/pillbox";

type InterventionPolicy = {
  risk_threshold: number;
  runtime_guardrails: {
    max_adaptive_reminders_per_patient_day: number;
    minimum_hours_between_adaptive_reminders: number;
  };
};

const defaultPolicy: InterventionPolicy = {
  risk_threshold: 0.32,
  runtime_guardrails: {
    max_adaptive_reminders_per_patient_day: 1,
    minimum_hours_between_adaptive_reminders: 6,
  },
};

function readPolicy(): InterventionPolicy {
  try {
    return JSON.parse(
      readFileSync(
        join(process.cwd(), ".data", "ml", "model", "intervention_policy.json"),
        "utf8"
      )
    ) as InterventionPolicy;
  } catch {
    return defaultPolicy;
  }
}

function budgetDecision(options: {
  patientId: string;
  doseDate: string;
  scheduledAt: string;
  candidate: boolean;
  policy: InterventionPolicy;
}): {
  allowed: boolean;
  reason: NonNullable<HardwareShadowDecision["budgetReason"]>;
} {
  if (!options.candidate) return { allowed: false, reason: "below_threshold" };
  const existing = getShadowDecisions(options.patientId)
    .filter(
      (decision) =>
        decision.adaptiveAllowedAfterBudget &&
        decision.scheduledAt < options.scheduledAt
    )
    .sort((left, right) => right.scheduledAt.localeCompare(left.scheduledAt));
  const todayCount = existing.filter(
    (decision) => decision.doseDate === options.doseDate
  ).length;
  if (
    todayCount >=
    options.policy.runtime_guardrails.max_adaptive_reminders_per_patient_day
  ) {
    return { allowed: false, reason: "daily_limit" };
  }
  const latest = existing[0];
  if (latest) {
    const gapHours =
      (new Date(options.scheduledAt).getTime() -
        new Date(latest.scheduledAt).getTime()) /
      3_600_000;
    if (
      gapHours <
      options.policy.runtime_guardrails.minimum_hours_between_adaptive_reminders
    ) {
      return { allowed: false, reason: "cooldown" };
    }
  }
  return { allowed: true, reason: "allowed" };
}

export async function scoreShadowDose(options: {
  patientId: string;
  doseId: string;
  doseDate: string;
  slot: HardwarePlanSlot;
  scheduledAt: string;
  events: OpeningEvent[];
  observationStartedAt?: string;
  safetyControlEvaluation?: boolean;
  syntheticStatus?: string;
  syntheticNeedsSupport?: number;
  syntheticBehaviourChangeSignal?: number;
  generatedAt?: string;
}): Promise<HardwareShadowDecision> {
  const features = buildAdherenceFeatureSnapshot({
    slot: options.slot,
    scheduledAt: options.scheduledAt,
    events: options.events,
    observationStartedAt: options.observationStartedAt,
  });
  const prediction = await predictAdherenceRisk(features);
  const policy = readPolicy();
  const candidate = prediction.riskProbability >= policy.risk_threshold;
  const budget = budgetDecision({
    patientId: options.patientId,
    doseDate: options.doseDate,
    scheduledAt: options.scheduledAt,
    candidate,
    policy,
  });
  const decision: HardwareShadowDecision = {
    doseId: options.doseId,
    patientId: options.patientId,
    doseDate: options.doseDate,
    compartmentId: options.slot.slotId,
    scheduledAt: options.scheduledAt,
    riskProbability: prediction.riskProbability,
    behaviourChangeProbability: prediction.behaviourChangeProbability,
    adaptiveCandidate: candidate,
    adaptiveAllowedAfterBudget: budget.allowed,
    safetyControlEvaluation: options.safetyControlEvaluation ?? false,
    syntheticStatus: options.syntheticStatus ?? "unknown",
    syntheticNeedsSupport: options.syntheticNeedsSupport ?? 0,
    syntheticBehaviourChangeSignal:
      options.syntheticBehaviourChangeSignal ?? 0,
    historyFeatures: features,
    modelVersion: prediction.modelVersion,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    riskThreshold: policy.risk_threshold,
    budgetReason: budget.reason,
  };
  addShadowDecision(decision);
  return decision;
}
