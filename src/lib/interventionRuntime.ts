import { randomUUID } from "node:crypto";

import { placeCaregiverCall } from "./caregiverCall";
import { setHardwareDeviceState } from "./hardwareEventStore";
import { recommendIntervention } from "./interventionPolicy";
import {
  getDoseInterventionDecisions,
  reserveInterventionDecision,
  updateInterventionDecision,
} from "./interventionStore";
import { getUserProfile } from "./userProfileStore";
import type { AdherenceDoseLifecycle } from "../types/adherence";
import type { HardwareShadowDecision } from "../types/hardware";
import type {
  AdherenceInterventionDecision,
  InterventionExecutionMode,
} from "../types/intervention";
import type { OpeningEvent } from "../types/pillbox";

export function getInterventionExecutionMode(): InterventionExecutionMode {
  const configured = process.env.ADHERENCE_INTERVENTION_MODE;
  if (configured === "shadow" || configured === "demo" || configured === "live") {
    return configured;
  }
  return process.env.NODE_ENV === "development" ? "demo" : "shadow";
}

function maskPhone(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;
  const visible = normalized.slice(-4);
  return `${"•".repeat(Math.max(0, normalized.length - 4))}${visible}`;
}

function createDecision(options: {
  record: AdherenceDoseLifecycle;
  shadowDecision?: HardwareShadowDecision;
  action: AdherenceInterventionDecision["action"];
  reasonCode: AdherenceInterventionDecision["reasonCode"];
  reason: string;
  now: Date;
}): AdherenceInterventionDecision {
  const mode = getInterventionExecutionMode();
  const idempotencyKey = `${options.record.doseId}:${options.action}`;
  return {
    id: randomUUID(),
    idempotencyKey,
    doseId: options.record.doseId,
    patientId: options.record.patientId,
    deviceId: options.record.deviceId,
    compartmentId: options.record.compartmentId,
    medication: options.record.planSnapshot.medication,
    scheduledAt: options.record.scheduledAt,
    action: options.action,
    reasonCode: options.reasonCode,
    reason: options.reason,
    highRisk: options.record.planSnapshot.highRisk,
    riskProbability: options.shadowDecision?.riskProbability ?? null,
    behaviourChangeProbability:
      options.shadowDecision?.behaviourChangeProbability ?? null,
    executionMode: mode,
    executionStatus: "pending",
    decidedAt: options.now.toISOString(),
    executedAt: null,
    caregiverPhoneMasked: null,
    callProvider: null,
    externalCallId: null,
    error: null,
  };
}

async function executeDecision(
  decision: AdherenceInterventionDecision
): Promise<AdherenceInterventionDecision> {
  const executedAt = new Date().toISOString();

  if (decision.action === "dose_completed") {
    return updateInterventionDecision({
      ...decision,
      executionStatus: "completed",
      executedAt,
    });
  }

  if (decision.action === "first_alert" || decision.action === "second_alert") {
    if (decision.executionMode === "shadow") {
      return updateInterventionDecision({
        ...decision,
        executionStatus: "shadowed",
        executedAt,
      });
    }
    setHardwareDeviceState(
      decision.deviceId,
      "reminding",
      decision.compartmentId,
      {
        trigger:
          decision.action === "second_alert" ? "adaptive" : "schedule",
        reminderStage:
          decision.action === "second_alert" ? "second" : "first",
        message:
          decision.action === "second_alert"
            ? `Second alert: open Slot ${decision.compartmentId}`
            : `Open Slot ${decision.compartmentId}`,
      }
    );
    return updateInterventionDecision({
      ...decision,
      executionStatus: "executed",
      executedAt,
    });
  }

  const caregiver = getUserProfile();
  const caregiverPhoneMasked = maskPhone(caregiver.phone);
  if (!caregiver.phone.trim()) {
    return updateInterventionDecision({
      ...decision,
      executionStatus: "failed",
      executedAt,
      caregiverPhoneMasked,
      error: "The caregiver profile does not contain a phone number.",
    });
  }

  try {
    const result = await placeCaregiverCall(
      {
        to: caregiver.phone,
        medication: decision.medication,
        compartmentId: decision.compartmentId,
        scheduledAt: decision.scheduledAt,
        highRisk: decision.highRisk,
        idempotencyKey: decision.idempotencyKey,
      },
      decision.executionMode
    );
    return updateInterventionDecision({
      ...decision,
      executionStatus: result.status,
      executedAt,
      caregiverPhoneMasked,
      callProvider: result.provider,
      externalCallId: result.externalCallId,
      error: result.error,
    });
  } catch (error) {
    return updateInterventionDecision({
      ...decision,
      executionStatus: "failed",
      executedAt,
      caregiverPhoneMasked,
      error:
        error instanceof Error ? error.message : "Caregiver call execution failed.",
    });
  }
}

export async function evaluateAndExecuteIntervention(options: {
  record: AdherenceDoseLifecycle;
  shadowDecision?: HardwareShadowDecision;
  events: OpeningEvent[];
  now: Date;
}): Promise<{
  decision: AdherenceInterventionDecision | null;
  created: boolean;
}> {
  const priorDecisions = getDoseInterventionDecisions(options.record.doseId);
  const recommendation = recommendIntervention({
    ...options,
    priorDecisions,
  });
  if (recommendation.action === "no_action") {
    return { decision: null, created: false };
  }

  const reserved = reserveInterventionDecision(
    createDecision({
      ...options,
      action: recommendation.action,
      reasonCode: recommendation.reasonCode,
      reason: recommendation.reason,
    })
  );
  if (!reserved.created) {
    return { decision: reserved.decision, created: false };
  }
  return {
    decision: await executeDecision(reserved.decision),
    created: true,
  };
}
