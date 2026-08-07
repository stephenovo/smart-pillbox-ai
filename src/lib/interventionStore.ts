import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { AdherenceInterventionDecision } from "../types/intervention";

const storePath = join(process.cwd(), ".data", "adherence-interventions.json");
const maxDecisions = 5_000;

type InterventionStore = {
  decisions: AdherenceInterventionDecision[];
};

function loadStore(): InterventionStore {
  try {
    const parsed = JSON.parse(
      readFileSync(storePath, "utf8")
    ) as Partial<InterventionStore>;
    return {
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
    };
  } catch {
    return { decisions: [] };
  }
}

const globalInterventionStore = globalThis as typeof globalThis & {
  __smartPillboxInterventionStore?: InterventionStore;
};

const store =
  globalInterventionStore.__smartPillboxInterventionStore ??
  (globalInterventionStore.__smartPillboxInterventionStore = loadStore());

function persist(): void {
  try {
    mkdirSync(dirname(storePath), { recursive: true });
    const temporaryPath = `${storePath}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify(store), "utf8");
    renameSync(temporaryPath, storePath);
  } catch {
    // Development intervention decisions remain available in memory.
  }
}

export function getInterventionDecisions(
  patientId?: string
): AdherenceInterventionDecision[] {
  const decisions = patientId
    ? store.decisions.filter((decision) => decision.patientId === patientId)
    : store.decisions;
  return [...decisions].sort((left, right) =>
    right.decidedAt.localeCompare(left.decidedAt)
  );
}

export function getDoseInterventionDecisions(
  doseId: string
): AdherenceInterventionDecision[] {
  return getInterventionDecisions().filter(
    (decision) => decision.doseId === doseId
  );
}

export function reserveInterventionDecision(
  decision: AdherenceInterventionDecision
): { decision: AdherenceInterventionDecision; created: boolean } {
  const existing = store.decisions.find(
    (item) => item.idempotencyKey === decision.idempotencyKey
  );
  if (existing) return { decision: existing, created: false };

  store.decisions = [decision, ...store.decisions].slice(0, maxDecisions);
  persist();
  return { decision, created: true };
}

export function updateInterventionDecision(
  next: AdherenceInterventionDecision
): AdherenceInterventionDecision {
  store.decisions = [
    next,
    ...store.decisions.filter(
      (decision) => decision.idempotencyKey !== next.idempotencyKey
    ),
  ].slice(0, maxDecisions);
  persist();
  return next;
}

export function clearInterventionDecisions(patientId?: string): void {
  store.decisions = patientId
    ? store.decisions.filter((decision) => decision.patientId !== patientId)
    : [];
  persist();
}
