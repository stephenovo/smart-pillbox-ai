import type { OpeningEvent } from "./pillbox";

export type HardwareEventType =
  | "lid_open"
  | "wrong_slot_open"
  | "reminder_started"
  | "reminder_stopped";

export type HardwareEventPayload = {
  deviceId: string;
  slotId: number;
  eventType: HardwareEventType;
  deviceTimestamp?: string;
  // Kept for compatibility with the first firmware draft.
  eventTime?: string;
  firmwareVersion?: string;
};

export type HardwareEventsApiResponse = {
  deviceId: string;
  events: OpeningEvent[];
  count: number;
  serverTime: string;
};

export type HardwarePlanSlot = {
  slotId: number;
  medication: string;
  scheduledTime: string;
  highRisk: boolean;
  bufferTimeMinutes: number;
};

export type HardwarePlanApiResponse = {
  deviceId: string;
  slots: HardwarePlanSlot[];
  serverTime: string;
};

export type HardwarePlanUpdatePayload = {
  deviceId: string;
  slots: HardwarePlanSlot[];
};

export type HardwareReminderStatus = "idle" | "reminding";
export type HardwareReminderTrigger = "manual" | "schedule" | null;
export type HardwareConnectionStatus =
  | "connected"
  | "offline"
  | "never_connected";

export type HardwareDeviceState = {
  deviceId: string;
  status: HardwareReminderStatus;
  activeSlot: number | null;
  scheduledAt: string | null;
  message: string;
  trigger: HardwareReminderTrigger;
  updatedAt: string;
  lastSeenAt: string | null;
  lastEventAt: string | null;
  connectionStatus: HardwareConnectionStatus;
  serverTime: string;
};

export type HardwareDeviceStateMutation = {
  deviceId: string;
  status: HardwareReminderStatus;
  activeSlot?: number | null;
};
