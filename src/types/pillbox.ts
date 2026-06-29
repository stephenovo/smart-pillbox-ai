export type MedicationSchedule = {
  compartment: number;
  medication: string;
  scheduledTime: string;
  highRisk: boolean;
  bufferTimeMinutes: number;
};

export type OpeningEvent = {
  id: string;
  eventTime: string;
  compartment: number;
  medication: string;
  eventType: "OPEN";
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