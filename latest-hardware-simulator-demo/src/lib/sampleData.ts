import type {
  DashboardKpi,
  MedicationSchedule,
  OpeningEvent,
} from "../types/pillbox";

export const initialMedicationSchedule: MedicationSchedule[] = [
  {
    compartment: 1,
    medication: "Blood Pressure Pill",
    scheduledTime: "08:00",
    highRisk: true,
    bufferTimeMinutes: 30,
  },
  {
    compartment: 2,
    medication: "Diabetes Pill",
    scheduledTime: "08:00",
    highRisk: false,
    bufferTimeMinutes: 60,
  },
  {
    compartment: 3,
    medication: "Vitamin D",
    scheduledTime: "13:00",
    highRisk: false,
    bufferTimeMinutes: 60,
  },
  {
    compartment: 4,
    medication: "Heart Medicine",
    scheduledTime: "20:00",
    highRisk: true,
    bufferTimeMinutes: 30,
  },
  {
    compartment: 5,
    medication: "",
    scheduledTime: "",
    highRisk: false,
    bufferTimeMinutes: 60,
  },
  {
    compartment: 6,
    medication: "",
    scheduledTime: "",
    highRisk: false,
    bufferTimeMinutes: 60,
  },
  {
    compartment: 7,
    medication: "",
    scheduledTime: "",
    highRisk: false,
    bufferTimeMinutes: 60,
  },
  {
    compartment: 8,
    medication: "",
    scheduledTime: "",
    highRisk: false,
    bufferTimeMinutes: 60,
  },
];

export const emptyDashboardKpis: DashboardKpi[] = [
  { label: "Active", value: 0 },
  { label: "Taken", value: 0 },
  { label: "Pending", value: 0 },
  { label: "Delayed", value: 0 },
  { label: "Missed", value: 0 },
  { label: "Duplicate Risk", value: 0 },
];

export const emptyOpeningEvents: OpeningEvent[] = [];