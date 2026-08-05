import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { initialMedicationSchedule } from "./sampleData";
import { hardwarePayloadToOpeningEvent } from "./hardwareProtocol";
import type {
  HardwareDeviceState,
  HardwareEventPayload,
  HardwarePlanSlot,
  HardwareReminderTrigger,
} from "../types/hardware";
import type { OpeningEvent } from "../types/pillbox";

const maxStoredEvents = 100;
const duplicateWindowMs = 1500;
const connectedWindowMs = 10_000;

type StoredDeviceState = {
  status: "idle" | "reminding";
  activeSlot: number | null;
  scheduledAt: string | null;
  message: string;
  trigger: HardwareReminderTrigger;
  updatedAt: string;
  lastSeenAt: string | null;
  lastEventAt: string | null;
};

type HardwareStore = {
  events: OpeningEvent[];
  plans: Map<string, HardwarePlanSlot[]>;
  states: Map<string, StoredDeviceState>;
  recentEventIds: Map<string, { eventId: string; receivedAtMs: number }>;
  triggeredScheduleKeys: Set<string>;
};

type PersistedHardwareStore = {
  events: OpeningEvent[];
  plans: Array<[string, HardwarePlanSlot[]]>;
  states: Array<[string, StoredDeviceState]>;
  recentEventIds: Array<
    [string, { eventId: string; receivedAtMs: number }]
  >;
  triggeredScheduleKeys: string[];
};

const storeDirectoryPath = join(process.cwd(), ".data");
const storeFilePath = join(storeDirectoryPath, "hardware-demo.json");

function createEmptyStore(): HardwareStore {
  return {
    events: [],
    plans: new Map(),
    states: new Map(),
    recentEventIds: new Map(),
    triggeredScheduleKeys: new Set(),
  };
}

function loadPersistedStore(): HardwareStore {
  try {
    const parsed = JSON.parse(
      readFileSync(storeFilePath, "utf8")
    ) as Partial<PersistedHardwareStore>;

    return {
      events: Array.isArray(parsed.events) ? parsed.events : [],
      plans: new Map(Array.isArray(parsed.plans) ? parsed.plans : []),
      states: new Map(Array.isArray(parsed.states) ? parsed.states : []),
      recentEventIds: new Map(
        Array.isArray(parsed.recentEventIds) ? parsed.recentEventIds : []
      ),
      triggeredScheduleKeys: new Set(
        Array.isArray(parsed.triggeredScheduleKeys)
          ? parsed.triggeredScheduleKeys
          : []
      ),
    };
  } catch {
    return createEmptyStore();
  }
}

const globalHardwareStore = globalThis as typeof globalThis & {
  __smartPillboxHardwareStore?: HardwareStore;
};

const store =
  globalHardwareStore.__smartPillboxHardwareStore ??
  (globalHardwareStore.__smartPillboxHardwareStore = loadPersistedStore());

function persistStore(): void {
  const serialized: PersistedHardwareStore = {
    events: store.events,
    plans: Array.from(store.plans.entries()),
    states: Array.from(store.states.entries()),
    recentEventIds: Array.from(store.recentEventIds.entries()),
    triggeredScheduleKeys: Array.from(store.triggeredScheduleKeys),
  };

  try {
    mkdirSync(storeDirectoryPath, { recursive: true });
    const temporaryPath = `${storeFilePath}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify(serialized), "utf8");
    renameSync(temporaryPath, storeFilePath);
  } catch {
    // The demo remains functional in memory if the temp directory is read-only.
  }
}

function getDefaultPlan(): HardwarePlanSlot[] {
  return initialMedicationSchedule
    .filter((item) => item.medication.trim() !== "")
    .map((item) => ({
      slotId: item.compartment,
      medication: item.medication,
      scheduledTime: item.scheduledTime,
      highRisk: item.highRisk,
      bufferTimeMinutes: item.bufferTimeMinutes,
    }));
}

function getOrCreateState(deviceId: string): StoredDeviceState {
  const current = store.states.get(deviceId);
  if (current) {
    return current;
  }

  const now = new Date().toISOString();
  const initialState: StoredDeviceState = {
    status: "idle",
    activeSlot: null,
    scheduledAt: null,
    message: "No active reminder",
    trigger: null,
    updatedAt: now,
    lastSeenAt: null,
    lastEventAt: null,
  };

  store.states.set(deviceId, initialState);
  return initialState;
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function evaluateScheduledReminder(deviceId: string, now: Date): void {
  const state = getOrCreateState(deviceId);
  if (state.status === "reminding") {
    return;
  }

  const localTime = getLocalTime(now);
  const dateKey = getLocalDateKey(now);
  const plan = getHardwarePlan(deviceId);
  const dueSlot = plan.find((slot) => {
    if (!slot.medication.trim() || slot.scheduledTime !== localTime) {
      return false;
    }

    const key = `${deviceId}:${dateKey}:${slot.slotId}:${slot.scheduledTime}`;
    return !store.triggeredScheduleKeys.has(key);
  });

  if (!dueSlot) {
    return;
  }

  const triggerKey = `${deviceId}:${dateKey}:${dueSlot.slotId}:${dueSlot.scheduledTime}`;
  store.triggeredScheduleKeys.add(triggerKey);

  const nowIso = now.toISOString();
  store.states.set(deviceId, {
    ...state,
    status: "reminding",
    activeSlot: dueSlot.slotId,
    scheduledAt: nowIso,
    message: `Open Slot ${dueSlot.slotId}`,
    trigger: "schedule",
    updatedAt: nowIso,
  });
  persistStore();
}

function toPublicDeviceState(
  deviceId: string,
  state: StoredDeviceState,
  now: Date
): HardwareDeviceState {
  const lastSeenMs = state.lastSeenAt
    ? new Date(state.lastSeenAt).getTime()
    : Number.NaN;
  const connectionStatus = !state.lastSeenAt
    ? "never_connected"
    : now.getTime() - lastSeenMs <= connectedWindowMs
      ? "connected"
      : "offline";

  return {
    deviceId,
    ...state,
    connectionStatus,
    serverTime: now.toISOString(),
  };
}

export function getHardwarePlan(deviceId: string): HardwarePlanSlot[] {
  const current = store.plans.get(deviceId);
  if (current) {
    return current;
  }

  const initialPlan = getDefaultPlan();
  store.plans.set(deviceId, initialPlan);
  return initialPlan;
}

export function setHardwarePlan(
  deviceId: string,
  slots: HardwarePlanSlot[]
): HardwarePlanSlot[] {
  const plan = slots.map((slot) => ({ ...slot }));
  store.plans.set(deviceId, plan);
  persistStore();
  return plan;
}

export function getHardwareDeviceState(
  deviceId: string,
  options: { markSeen?: boolean; evaluateSchedule?: boolean } = {}
): HardwareDeviceState {
  const now = new Date();
  let state = getOrCreateState(deviceId);

  if (options.markSeen) {
    state = { ...state, lastSeenAt: now.toISOString() };
    store.states.set(deviceId, state);
  }

  if (options.evaluateSchedule) {
    evaluateScheduledReminder(deviceId, now);
    state = getOrCreateState(deviceId);
  }

  return toPublicDeviceState(deviceId, state, now);
}

export function setHardwareDeviceState(
  deviceId: string,
  status: "idle" | "reminding",
  activeSlot: number | null
): HardwareDeviceState {
  const current = getOrCreateState(deviceId);
  const now = new Date();
  const next: StoredDeviceState = {
    ...current,
    status,
    activeSlot: status === "reminding" ? activeSlot : null,
    scheduledAt: status === "reminding" ? now.toISOString() : null,
    message:
      status === "reminding" ? `Open Slot ${activeSlot}` : "No active reminder",
    trigger: status === "reminding" ? "manual" : null,
    updatedAt: now.toISOString(),
  };

  store.states.set(deviceId, next);
  persistStore();
  return toPublicDeviceState(deviceId, next, now);
}

export function getHardwareOpeningEvents(deviceId?: string): OpeningEvent[] {
  return deviceId
    ? store.events.filter((event) => event.deviceId === deviceId)
    : store.events;
}

export function addHardwareOpeningEvent(
  payload: HardwareEventPayload,
  options: { receivedAt?: string } = {}
): {
  event: OpeningEvent | null;
  duplicate: boolean;
} {
  const now = new Date();
  const nowIso = now.toISOString();
  const eventReceivedAt = options.receivedAt ?? nowIso;
  const eventReceivedAtMs = new Date(eventReceivedAt).getTime();
  const currentState = getOrCreateState(payload.deviceId);
  const isOpeningEvent =
    payload.eventType === "lid_open" || payload.eventType === "wrong_slot_open";

  const nextSeenState: StoredDeviceState = {
    ...currentState,
    lastSeenAt: nowIso,
    lastEventAt: isOpeningEvent ? eventReceivedAt : currentState.lastEventAt,
  };
  store.states.set(payload.deviceId, nextSeenState);

  if (!isOpeningEvent) {
    return { event: null, duplicate: false };
  }

  const effectiveEventType =
    nextSeenState.status === "reminding" &&
    nextSeenState.activeSlot !== payload.slotId
      ? "wrong_slot_open"
      : payload.eventType === "wrong_slot_open"
        ? "wrong_slot_open"
        : "lid_open";
  const duplicateKey = `${payload.deviceId}:${payload.slotId}:${effectiveEventType}`;
  const recent = store.recentEventIds.get(duplicateKey);

  if (
    recent &&
    Math.abs(eventReceivedAtMs - recent.receivedAtMs) < duplicateWindowMs
  ) {
    const duplicateEvent = store.events.find(
      (event) => event.id === recent.eventId
    );
    return { event: duplicateEvent ?? null, duplicate: true };
  }

  const event = hardwarePayloadToOpeningEvent(
    payload,
    getHardwarePlan(payload.deviceId),
    {
      eventType: effectiveEventType,
      activeSlotAtEvent: nextSeenState.activeSlot,
      receivedAt: eventReceivedAt,
    }
  );

  if (!event) {
    return { event: null, duplicate: false };
  }

  store.events = [event, ...store.events].slice(0, maxStoredEvents);
  store.recentEventIds.set(duplicateKey, {
    eventId: event.id,
    receivedAtMs: eventReceivedAtMs,
  });

  if (
    effectiveEventType === "lid_open" &&
    nextSeenState.status === "reminding" &&
    nextSeenState.activeSlot === payload.slotId
  ) {
    store.states.set(payload.deviceId, {
      ...nextSeenState,
      status: "idle",
      activeSlot: null,
      scheduledAt: null,
      message: "No active reminder",
      trigger: null,
      updatedAt: nowIso,
    });
  }

  persistStore();

  return { event, duplicate: false };
}

export function clearHardwareOpeningEvents(deviceId?: string): void {
  store.events = deviceId
    ? store.events.filter((event) => event.deviceId !== deviceId)
    : [];
  store.recentEventIds.clear();
  persistStore();
}
