import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { AdherenceDoseLifecycle } from "../types/adherence";

const storePath = join(process.cwd(), ".data", "adherence-lifecycle.json");
const maxRecords = 10_000;

type LifecycleStore = {
  records: AdherenceDoseLifecycle[];
};

function loadStore(): LifecycleStore {
  try {
    const parsed = JSON.parse(
      readFileSync(storePath, "utf8")
    ) as Partial<LifecycleStore>;
    return { records: Array.isArray(parsed.records) ? parsed.records : [] };
  } catch {
    return { records: [] };
  }
}

const globalLifecycleStore = globalThis as typeof globalThis & {
  __smartPillboxLifecycleStore?: LifecycleStore;
};
const store =
  globalLifecycleStore.__smartPillboxLifecycleStore ??
  (globalLifecycleStore.__smartPillboxLifecycleStore = loadStore());

function persist(): void {
  try {
    mkdirSync(dirname(storePath), { recursive: true });
    const temporaryPath = `${storePath}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify(store), "utf8");
    renameSync(temporaryPath, storePath);
  } catch {
    // Local shadow mode remains usable in memory if persistence is unavailable.
  }
}

export function getDoseLifecycles(
  patientId?: string
): AdherenceDoseLifecycle[] {
  const records = patientId
    ? store.records.filter((record) => record.patientId === patientId)
    : store.records;
  return [...records].sort((left, right) =>
    right.scheduledAt.localeCompare(left.scheduledAt)
  );
}

export function getDoseLifecycle(
  doseId: string
): AdherenceDoseLifecycle | undefined {
  return store.records.find((record) => record.doseId === doseId);
}

export function upsertDoseLifecycle(record: AdherenceDoseLifecycle): void {
  store.records = [
    record,
    ...store.records.filter((item) => item.doseId !== record.doseId),
  ]
    .sort((left, right) => right.scheduledAt.localeCompare(left.scheduledAt))
    .slice(0, maxRecords);
  persist();
}

export function clearDoseLifecycles(patientId?: string): void {
  store.records = patientId
    ? store.records.filter((record) => record.patientId !== patientId)
    : [];
  persist();
}
