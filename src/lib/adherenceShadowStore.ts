import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { HardwareShadowDecision } from "../types/hardware";

const storePath = join(process.cwd(), ".data", "adherence-shadow.json");
const maxDecisions = 1_000;

type ShadowStore = {
  decisions: HardwareShadowDecision[];
};

function loadStore(): ShadowStore {
  try {
    const parsed = JSON.parse(readFileSync(storePath, "utf8")) as Partial<ShadowStore>;
    return { decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [] };
  } catch {
    return { decisions: [] };
  }
}

const globalShadowStore = globalThis as typeof globalThis & {
  __smartPillboxShadowStore?: ShadowStore;
};
const store =
  globalShadowStore.__smartPillboxShadowStore ??
  (globalShadowStore.__smartPillboxShadowStore = loadStore());

function persist(): void {
  try {
    mkdirSync(dirname(storePath), { recursive: true });
    const temporaryPath = `${storePath}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify(store), "utf8");
    renameSync(temporaryPath, storePath);
  } catch {
    // Shadow mode remains usable in memory when persistence is unavailable.
  }
}

export function getShadowDecisions(patientId?: string): HardwareShadowDecision[] {
  return patientId
    ? store.decisions.filter((decision) => decision.patientId === patientId)
    : [...store.decisions];
}

export function addShadowDecision(decision: HardwareShadowDecision): void {
  store.decisions = [
    decision,
    ...store.decisions.filter((item) => item.doseId !== decision.doseId),
  ].slice(0, maxDecisions);
  persist();
}

export function clearShadowDecisions(patientId?: string): void {
  store.decisions = patientId
    ? store.decisions.filter((decision) => decision.patientId !== patientId)
    : [];
  persist();
}
