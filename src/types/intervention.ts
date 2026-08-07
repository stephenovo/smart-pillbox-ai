export type InterventionAction =
  | "no_action"
  | "first_alert"
  | "second_alert"
  | "caregiver_call"
  | "high_risk_escalation"
  | "dose_completed";

export type InterventionExecutionMode = "shadow" | "demo" | "live";

export type InterventionExecutionStatus =
  | "pending"
  | "shadowed"
  | "simulated"
  | "executed"
  | "completed"
  | "failed";

export type InterventionReasonCode =
  | "before_schedule"
  | "valid_opening_recorded"
  | "scheduled_first_alert"
  | "waiting_for_second_alert_window"
  | "model_did_not_allow_adaptive_support"
  | "adaptive_second_alert_allowed"
  | "waiting_for_caregiver_threshold"
  | "no_opening_after_adaptive_support"
  | "high_risk_no_opening_by_buffer";

export type AdherenceInterventionDecision = {
  id: string;
  idempotencyKey: string;
  doseId: string;
  patientId: string;
  deviceId: string;
  compartmentId: number;
  medication: string;
  scheduledAt: string;
  action: Exclude<InterventionAction, "no_action">;
  reasonCode: InterventionReasonCode;
  reason: string;
  highRisk: boolean;
  riskProbability: number | null;
  behaviourChangeProbability: number | null;
  executionMode: InterventionExecutionMode;
  executionStatus: InterventionExecutionStatus;
  decidedAt: string;
  executedAt: string | null;
  caregiverPhoneMasked: string | null;
  callProvider: "simulation" | "twilio" | null;
  externalCallId: string | null;
  error: string | null;
};

export type InterventionRecommendation = {
  action: InterventionAction;
  reasonCode: InterventionReasonCode;
  reason: string;
};

export type AdherenceInterventionsApiResponse = {
  patientId: string | null;
  executionMode: InterventionExecutionMode;
  decisions: AdherenceInterventionDecision[];
  count: number;
  warning: string;
};
