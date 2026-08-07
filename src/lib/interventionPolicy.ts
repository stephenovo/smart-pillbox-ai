import type { AdherenceDoseLifecycle } from "../types/adherence";
import type { HardwareShadowDecision } from "../types/hardware";
import type {
  AdherenceInterventionDecision,
  InterventionRecommendation,
} from "../types/intervention";
import type { OpeningEvent } from "../types/pillbox";

const earlyOpeningToleranceMinutes = 60;

function parseEventTime(value: string): number {
  return new Date(value.replace(" ", "T") + ":00").getTime();
}

function hasValidOpening(options: {
  record: AdherenceDoseLifecycle;
  events: OpeningEvent[];
  now: Date;
}): boolean {
  const scheduledMs = new Date(options.record.scheduledAt).getTime();
  const observationStart =
    scheduledMs - earlyOpeningToleranceMinutes * 60_000;
  const observationEnd = Math.min(
    options.now.getTime(),
    new Date(options.record.outcomeMaturesAt).getTime()
  );

  return options.events.some((event) => {
    if (
      event.deviceId !== options.record.deviceId ||
      event.compartment !== options.record.compartmentId ||
      event.eventType !== "lid_open"
    ) {
      return false;
    }
    const eventMs = parseEventTime(event.eventTime);
    return eventMs >= observationStart && eventMs <= observationEnd;
  });
}

function hasAction(
  decisions: AdherenceInterventionDecision[],
  action: AdherenceInterventionDecision["action"]
): boolean {
  return decisions.some((decision) => decision.action === action);
}

function secondAlertAt(record: AdherenceDoseLifecycle): number {
  const scheduledMs = new Date(record.scheduledAt).getTime();
  const bufferMinutes = record.planSnapshot.bufferTimeMinutes;
  const latestUsefulDelay = Math.max(1, bufferMinutes - 1);
  const preferredDelay = Math.max(5, Math.round(bufferMinutes * 0.5));
  const delayMinutes = Math.min(30, latestUsefulDelay, preferredDelay);
  return scheduledMs + delayMinutes * 60_000;
}

export function recommendIntervention(options: {
  record: AdherenceDoseLifecycle;
  shadowDecision?: HardwareShadowDecision;
  priorDecisions: AdherenceInterventionDecision[];
  events: OpeningEvent[];
  now: Date;
}): InterventionRecommendation {
  const { record, shadowDecision, priorDecisions, now } = options;
  const scheduledMs = new Date(record.scheduledAt).getTime();
  const bufferDeadlineMs = new Date(record.bufferDeadline).getTime();

  if (hasValidOpening(options)) {
    return {
      action: "dose_completed",
      reasonCode: "valid_opening_recorded",
      reason:
        "A valid opening was recorded for the scheduled compartment, so pending alerts and escalation stop.",
    };
  }

  if (now.getTime() < scheduledMs) {
    return {
      action: "no_action",
      reasonCode: "before_schedule",
      reason: "The scheduled dose time has not arrived.",
    };
  }

  if (now.getTime() >= bufferDeadlineMs) {
    if (record.planSnapshot.highRisk) {
      return {
        action: "high_risk_escalation",
        reasonCode: "high_risk_no_opening_by_buffer",
        reason:
          "No valid opening was recorded by the caregiver-defined buffer for a high-risk medication.",
      };
    }

    if (shadowDecision?.adaptiveAllowedAfterBudget) {
      return {
        action: "caregiver_call",
        reasonCode: "no_opening_after_adaptive_support",
        reason:
          "No valid opening was recorded by the escalation threshold after adaptive support was approved.",
      };
    }

    return {
      action: "no_action",
      reasonCode: "model_did_not_allow_adaptive_support",
      reason:
        "The model and reminder budget did not approve adaptive escalation for this dose.",
    };
  }

  if (!hasAction(priorDecisions, "first_alert")) {
    return {
      action: "first_alert",
      reasonCode: "scheduled_first_alert",
      reason:
        "The scheduled dose time arrived without a valid opening, so the deterministic local reminder starts.",
    };
  }

  if (now.getTime() < secondAlertAt(record)) {
    return {
      action: "no_action",
      reasonCode: "waiting_for_second_alert_window",
      reason:
        "The system is allowing time for a natural response to the first local reminder.",
    };
  }

  if (!shadowDecision?.adaptiveAllowedAfterBudget) {
    return {
      action: "no_action",
      reasonCode: "model_did_not_allow_adaptive_support",
      reason:
        "The risk score, daily budget, or cooldown did not allow a second alert.",
    };
  }

  if (!hasAction(priorDecisions, "second_alert")) {
    return {
      action: "second_alert",
      reasonCode: "adaptive_second_alert_allowed",
      reason:
        "The dose remains unopened and the trained risk model plus intervention budget approved one adaptive second alert.",
    };
  }

  return {
    action: "no_action",
    reasonCode: "waiting_for_caregiver_threshold",
    reason:
      "The second local alert was issued and the system is waiting until the caregiver escalation threshold.",
  };
}
