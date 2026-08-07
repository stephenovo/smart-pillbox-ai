import { scoreShadowDose } from "./adherenceShadow";
import { getShadowDecisions } from "./adherenceShadowStore";
import { evaluateAndExecuteIntervention } from "./interventionRuntime";
import {
  getDoseLifecycle,
  upsertDoseLifecycle,
} from "./adherenceLifecycleStore";
import type {
  AdherenceDoseLifecycle,
  AdherenceLifecycleTickSummary,
  DoseObservationLabel,
  DoseObservationOutcome,
} from "../types/adherence";
import type { HardwarePlanSlot } from "../types/hardware";
import type { OpeningEvent } from "../types/pillbox";

const onTimeWindowMinutes = 15;
const earlyOpeningToleranceMinutes = 60;
const defaultScoringHorizonMinutes = 30;
const defaultOutcomeMaturityHours = 24;
const defaultBackfillDays = 7;
const failedScoreRetryMinutes = 5;

function localDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: Date, amount: number): Date {
  const result = new Date(value);
  result.setDate(result.getDate() + amount);
  return result;
}

function parseEventTime(value: string): Date {
  return new Date(value.replace(" ", "T") + ":00");
}

function observationStartedAt(events: OpeningEvent[]): string | undefined {
  return [...events]
    .sort((left, right) => left.eventTime.localeCompare(right.eventTime))[0]
    ?.eventTime.replace(" ", "T");
}

function labelForDelay(
  delayMinutes: number,
  bufferMinutes: number,
  openingCount: number
): DoseObservationLabel {
  if (openingCount >= 2) return "duplicate_opening";
  if (delayMinutes < 0) return "opened_too_early";
  if (delayMinutes <= onTimeWindowMinutes) return "observed_on_time";
  if (delayMinutes <= bufferMinutes) return "observed_delayed";
  return "observed_very_late";
}

function semanticOutcomeChanged(
  previous: DoseObservationOutcome | undefined,
  next: Omit<DoseObservationOutcome, "evaluatedAt" | "revision">
): boolean {
  if (!previous) return true;
  return (
    previous.label !== next.label ||
    previous.state !== next.state ||
    previous.doseCompleted !== next.doseCompleted ||
    previous.completionBasis !== next.completionBasis ||
    previous.observedByBuffer !== next.observedByBuffer ||
    previous.firstOpeningAt !== next.firstOpeningAt ||
    previous.openingCount !== next.openingCount ||
    previous.delayMinutes !== next.delayMinutes ||
    previous.eventIds.join("|") !== next.eventIds.join("|")
  );
}

export function evaluateDoseObservation(options: {
  record: AdherenceDoseLifecycle;
  events: OpeningEvent[];
  now: Date;
}): DoseObservationOutcome | undefined {
  const scheduledAt = new Date(options.record.scheduledAt);
  const bufferDeadline = new Date(options.record.bufferDeadline);
  const maturesAt = new Date(options.record.outcomeMaturesAt);
  if (options.now.getTime() < bufferDeadline.getTime()) return undefined;

  // Reserve the final pre-dose hour for the next day's dose so one opening can
  // never label both adjacent daily lifecycles.
  const attributionEnd =
    maturesAt.getTime() - earlyOpeningToleranceMinutes * 60_000;
  const observationEnd = Math.min(options.now.getTime(), attributionEnd);
  const observationStart =
    scheduledAt.getTime() - earlyOpeningToleranceMinutes * 60_000;
  const events = options.events
    .filter((event) => {
      if (
        event.deviceId !== options.record.deviceId ||
        event.compartment !== options.record.compartmentId ||
        event.eventType !== "lid_open"
      ) {
        return false;
      }
      const eventMs = parseEventTime(event.eventTime).getTime();
      return (
        eventMs >= observationStart &&
        eventMs <= observationEnd &&
        eventMs < attributionEnd &&
        eventMs < maturesAt.getTime()
      );
    })
    .sort(
      (left, right) =>
        parseEventTime(left.eventTime).getTime() -
        parseEventTime(right.eventTime).getTime()
    );
  const firstEvent = events[0];
  const firstOpeningMs = firstEvent
    ? parseEventTime(firstEvent.eventTime).getTime()
    : null;
  const delayMinutes =
    firstOpeningMs === null
      ? null
      : Math.round((firstOpeningMs - scheduledAt.getTime()) / 60_000);
  const semantic = {
    label: firstEvent
      ? labelForDelay(
          delayMinutes as number,
          options.record.planSnapshot.bufferTimeMinutes,
          events.length
        )
      : ("no_open_by_buffer" as const),
    state:
      options.now.getTime() >= maturesAt.getTime()
        ? ("final" as const)
        : ("provisional" as const),
    doseCompleted: firstOpeningMs !== null,
    completionBasis:
      firstOpeningMs !== null
        ? ("valid_lid_open" as const)
        : ("no_valid_lid_open" as const),
    observedByBuffer:
      firstOpeningMs !== null && firstOpeningMs <= bufferDeadline.getTime(),
    firstOpeningAt: firstEvent?.eventTime ?? null,
    openingCount: events.length,
    delayMinutes,
    eventIds: events.map((event) => event.id),
    labelSource: "lid_open_events" as const,
    proxyWarning: "Lid openings do not confirm medication ingestion." as const,
  };
  const changed = semanticOutcomeChanged(options.record.outcome, semantic);
  return {
    ...semantic,
    evaluatedAt: options.now.toISOString(),
    revision: changed
      ? (options.record.outcome?.revision ?? 0) + 1
      : (options.record.outcome?.revision ?? 1),
  };
}

function createLifecycleRecord(options: {
  patientId: string;
  deviceId: string;
  doseDate: string;
  slot: HardwarePlanSlot;
  scheduledAt: string;
  outcomeMaturityHours: number;
  now: Date;
}): AdherenceDoseLifecycle {
  const scheduledMs = new Date(options.scheduledAt).getTime();
  const nowIso = options.now.toISOString();
  return {
    doseId: `live-${options.deviceId}-${options.doseDate}-${options.slot.slotId}`,
    patientId: options.patientId,
    deviceId: options.deviceId,
    doseDate: options.doseDate,
    compartmentId: options.slot.slotId,
    scheduledAt: options.scheduledAt,
    bufferDeadline: new Date(
      scheduledMs + options.slot.bufferTimeMinutes * 60_000
    ).toISOString(),
    outcomeMaturesAt: new Date(
      scheduledMs + options.outcomeMaturityHours * 3_600_000
    ).toISOString(),
    planSnapshot: { ...options.slot },
    scoringStatus: "pending",
    safetyControlEvaluation: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export async function runAdherenceLifecycleTick(options: {
  patientId?: string;
  deviceId: string;
  plan: HardwarePlanSlot[];
  events: OpeningEvent[];
  now?: Date;
  scoringHorizonMinutes?: number;
  outcomeMaturityHours?: number;
  backfillDays?: number;
  observationStartedAt?: string;
}): Promise<AdherenceLifecycleTickSummary> {
  const now = options.now ?? new Date();
  const patientId = options.patientId ?? options.deviceId;
  const scoringHorizonMinutes =
    options.scoringHorizonMinutes ?? defaultScoringHorizonMinutes;
  const minimumMaturityHours = Math.ceil(
    (Math.max(0, ...options.plan.map((slot) => slot.bufferTimeMinutes)) +
      earlyOpeningToleranceMinutes) /
      60
  );
  const outcomeMaturityHours = Math.max(
    options.outcomeMaturityHours ?? defaultOutcomeMaturityHours,
    minimumMaturityHours
  );
  const backfillDays = options.backfillDays ?? defaultBackfillDays;
  const horizonEnd = now.getTime() + scoringHorizonMinutes * 60_000;
  const observationStartMs = options.observationStartedAt
    ? new Date(options.observationStartedAt).getTime()
    : Number.NEGATIVE_INFINITY;
  const summary: AdherenceLifecycleTickSummary = {
    patientId,
    deviceId: options.deviceId,
    evaluatedAt: now.toISOString(),
    scoringHorizonMinutes,
    createdCount: 0,
    scoredCount: 0,
    scoringFailedCount: 0,
    missedScoringWindowCount: 0,
    labeledCount: 0,
    finalizedCount: 0,
    safetyControlCount: 0,
    interventionDecisionCount: 0,
    interventionExecutedCount: 0,
    caregiverCallCount: 0,
    touchedDoseIds: [],
    warning:
      "Valid scheduled-compartment openings are treated as dose completion. Calls are simulated unless explicitly unlocked for live execution.",
  };
  const existingShadowDecisions = getShadowDecisions(patientId);

  for (let dayOffset = -backfillDays; dayOffset <= 1; dayOffset += 1) {
    const doseDate = localDateKey(addDays(now, dayOffset));
    for (const slot of options.plan.filter(
      (item) => item.medication.trim() && item.scheduledTime
    )) {
      const scheduledAt = `${doseDate}T${slot.scheduledTime}:00`;
      const scheduledMs = new Date(scheduledAt).getTime();
      if (scheduledMs < observationStartMs) continue;
      const doseId = `live-${options.deviceId}-${doseDate}-${slot.slotId}`;
      let record = getDoseLifecycle(doseId);
      if (!record && scheduledMs > horizonEnd) continue;
      if (!record) {
        record = createLifecycleRecord({
          patientId,
          deviceId: options.deviceId,
          doseDate,
          slot,
          scheduledAt,
          outcomeMaturityHours,
          now,
        });
        summary.createdCount += 1;
      }
      const before = record;
      const existingDecision = existingShadowDecisions.find(
        (decision) => decision.doseId === doseId
      );
      let shadowDecision = existingDecision;

      if (existingDecision && record.scoringStatus !== "scored") {
        record = {
          ...record,
          scoringStatus: "scored",
          shadowDecisionGeneratedAt: existingDecision.generatedAt,
          scoringError: undefined,
          updatedAt: now.toISOString(),
        };
      } else if (
        scheduledMs > now.getTime() &&
        scheduledMs <= horizonEnd &&
        record.scoringStatus !== "scored" &&
        (record.scoringStatus !== "failed" ||
          !record.scoreAttemptedAt ||
          now.getTime() - new Date(record.scoreAttemptedAt).getTime() >=
            failedScoreRetryMinutes * 60_000)
      ) {
        try {
          const decision = await scoreShadowDose({
            patientId,
            doseId,
            doseDate,
            slot,
            scheduledAt,
            events: options.events,
            observationStartedAt:
              options.observationStartedAt ?? observationStartedAt(options.events),
            generatedAt: now.toISOString(),
          });
          shadowDecision = decision;
          record = {
            ...record,
            scoringStatus: "scored",
            scoreAttemptedAt: now.toISOString(),
            shadowDecisionGeneratedAt: decision.generatedAt,
            scoringError: undefined,
            updatedAt: now.toISOString(),
          };
          summary.scoredCount += 1;
        } catch (error) {
          record = {
            ...record,
            scoringStatus: "failed",
            scoreAttemptedAt: now.toISOString(),
            scoringError:
              error instanceof Error
                ? error.message
                : "Shadow model inference failed.",
            updatedAt: now.toISOString(),
          };
          summary.scoringFailedCount += 1;
        }
      } else if (
        scheduledMs <= now.getTime() &&
        record.scoringStatus === "pending"
      ) {
        record = {
          ...record,
          scoringStatus: "missed_scoring_window",
          updatedAt: now.toISOString(),
        };
        summary.missedScoringWindowCount += 1;
      }

      const outcome = evaluateDoseObservation({
        record,
        events: options.events,
        now,
      });
      if (outcome) {
        const outcomeChanged = semanticOutcomeChanged(record.outcome, outcome);
        if (outcomeChanged) summary.labeledCount += 1;
        if (record.outcome?.state !== "final" && outcome.state === "final") {
          summary.finalizedCount += 1;
        }
        const safetyControlEvaluation =
          record.planSnapshot.highRisk && !outcome.observedByBuffer;
        if (safetyControlEvaluation) summary.safetyControlCount += 1;
        if (
          outcomeChanged ||
          record.safetyControlEvaluation !== safetyControlEvaluation
        ) {
          record = {
            ...record,
            outcome: outcomeChanged ? outcome : record.outcome,
            safetyControlEvaluation,
            updatedAt: now.toISOString(),
          };
        }
      }

      if (record !== before || !getDoseLifecycle(doseId)) {
        upsertDoseLifecycle(record);
        summary.touchedDoseIds.push(doseId);
      }

      if (doseDate === localDateKey(now)) {
        const intervention = await evaluateAndExecuteIntervention({
          record,
          shadowDecision,
          events: options.events,
          now,
        });
        if (intervention.created && intervention.decision) {
          summary.interventionDecisionCount += 1;
          if (
            intervention.decision.executionStatus === "executed" ||
            intervention.decision.executionStatus === "simulated"
          ) {
            summary.interventionExecutedCount += 1;
          }
          if (
            intervention.decision.action === "caregiver_call" ||
            intervention.decision.action === "high_risk_escalation"
          ) {
            summary.caregiverCallCount += 1;
          }
        }
      }
    }
  }
  return summary;
}

const globalTickState = globalThis as typeof globalThis & {
  __smartPillboxLifecycleTicks?: Map<
    string,
    Promise<AdherenceLifecycleTickSummary>
  >;
};
const inFlightTicks =
  globalTickState.__smartPillboxLifecycleTicks ??
  (globalTickState.__smartPillboxLifecycleTicks = new Map());

export function queueAdherenceLifecycleTick(
  options: Parameters<typeof runAdherenceLifecycleTick>[0]
): Promise<AdherenceLifecycleTickSummary> {
  const current = inFlightTicks.get(options.deviceId);
  if (current) return current;
  const tick = runAdherenceLifecycleTick(options).finally(() => {
    if (inFlightTicks.get(options.deviceId) === tick) {
      inFlightTicks.delete(options.deviceId);
    }
  });
  inFlightTicks.set(options.deviceId, tick);
  return tick;
}
