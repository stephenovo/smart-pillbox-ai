export type MedicationSchedule = {
  compartment: number;
  medication: string;
  scheduledTime: string;
  highRisk: boolean;
  bufferTimeMinutes: number;
};

export type PillboxEventSource = "hardware" | "simulation";

export type PillboxOpeningEventType = "lid_open" | "wrong_slot_open";

export type OpeningEvent = {
  id: string;
  eventTime: string;
  receivedAt: string;
  compartment: number;
  medication: string;
  eventType: PillboxOpeningEventType;
  source: PillboxEventSource;
  deviceId: string;
  activeSlotAtEvent?: number | null;
  deviceTimestamp?: string;
  firmwareVersion?: string;
};

export type MedicationStatus =
  | "No opening record"
  | "Taken - On Time"
  | "Taken - Delayed"
  | "Pending"
  | "Upcoming"
  | "Missed"
  | "Missed / Very Late"
  | "Duplicate Risk";

export type DashboardKpi = {
  label: string;
  value: number;
};

export type SafetyStatus =
  | "No opening record"
  | "Taken - On Time"
  | "Taken - Delayed"
  | "Opened Too Early"
  | "Missed / Very Late"
  | "Duplicate Risk";
  
export type DailyMedicationStatus = {
  compartment: number;
  medication: string;
  scheduledTime: string;
  bufferTimeMinutes: number;
  highRisk: boolean;
  firstOpenTime: string;
  delayMinutes: number | null;
  openingCount: number;
  duplicateRisk: boolean;
  status: SafetyStatus;
};
