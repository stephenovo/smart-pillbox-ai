import type { HardwarePlanSlot } from "./hardware";

export type DoseObservationLabel =
  | "observed_on_time"
  | "observed_delayed"
  | "no_open_by_buffer"
  | "observed_very_late"
  | "duplicate_opening"
  | "opened_too_early";

export type DoseOutcomeState = "provisional" | "final";

export type DoseObservationOutcome = {
  label: DoseObservationLabel;
  state: DoseOutcomeState;
  observedByBuffer: boolean;
  firstOpeningAt: string | null;
  openingCount: number;
  delayMinutes: number | null;
  eventIds: string[];
  evaluatedAt: string;
  revision: number;
  labelSource: "lid_open_events";
  proxyWarning: "Lid openings do not confirm medication ingestion.";
};

export type DoseScoringStatus =
  | "pending"
  | "scored"
  | "failed"
  | "missed_scoring_window";

export type AdherenceDoseLifecycle = {
  doseId: string;
  patientId: string;
  deviceId: string;
  doseDate: string;
  compartmentId: number;
  scheduledAt: string;
  bufferDeadline: string;
  outcomeMaturesAt: string;
  planSnapshot: HardwarePlanSlot;
  scoringStatus: DoseScoringStatus;
  scoreAttemptedAt?: string;
  shadowDecisionGeneratedAt?: string;
  scoringError?: string;
  outcome?: DoseObservationOutcome;
  safetyControlEvaluation: boolean | null;
  createdAt: string;
  updatedAt: string;
};

export type AdherenceLifecycleTickSummary = {
  patientId: string;
  deviceId: string;
  evaluatedAt: string;
  scoringHorizonMinutes: number;
  createdCount: number;
  scoredCount: number;
  scoringFailedCount: number;
  missedScoringWindowCount: number;
  labeledCount: number;
  finalizedCount: number;
  safetyControlCount: number;
  touchedDoseIds: string[];
  warning: "Shadow only. No reminder was sent.";
};
