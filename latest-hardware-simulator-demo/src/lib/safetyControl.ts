import type {
  DashboardKpi,
  DailyMedicationStatus,
  MedicationSchedule,
  OpeningEvent,
  SafetyStatus,
} from "../types/pillbox";

function parseDateTime(dateText: string, timeText: string): Date {
  return new Date(`${dateText}T${timeText}:00`);
}

function parseEventDateTime(eventTime: string): Date {
  // eventTime format: "YYYY-MM-DD HH:mm"
  return new Date(eventTime.replace(" ", "T") + ":00");
}

function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function classifyMedicationStatus(
  item: MedicationSchedule,
  events: OpeningEvent[],
  analysisDate: string
): DailyMedicationStatus | null {
  const matchingEvents = events
    .filter(
      (event) =>
        event.compartment === item.compartment &&
        event.eventType === "lid_open" &&
        event.eventTime.slice(0, 10) === analysisDate
    )
    .sort(
      (a, b) =>
        parseEventDateTime(a.eventTime).getTime() -
        parseEventDateTime(b.eventTime).getTime()
    );

  if (matchingEvents.length === 0) {
    return null;
  }

  const scheduledDateTime = parseDateTime(analysisDate, item.scheduledTime);

  const firstEvent = matchingEvents[0];
  const firstOpenDateTime = parseEventDateTime(firstEvent.eventTime);
  const delayMinutes = minutesBetween(scheduledDateTime, firstOpenDateTime);

  const openingCount = matchingEvents.length;
  const duplicateRisk = openingCount >= 2;

  let status: SafetyStatus;

  if (duplicateRisk) {
    status = "Duplicate Risk";
  } else if (delayMinutes < 0) {
    status = "Opened Too Early";
  } else if (delayMinutes <= 15) {
    status = "Taken - On Time";
  } else if (delayMinutes <= item.bufferTimeMinutes) {
    status = "Taken - Delayed";
  } else {
    status = "Missed / Very Late";
  }

  return {
    compartment: item.compartment,
    medication: item.medication,
    scheduledTime: item.scheduledTime,
    bufferTimeMinutes: item.bufferTimeMinutes,
    highRisk: item.highRisk,
    firstOpenTime: firstEvent.eventTime,
    delayMinutes,
    openingCount,
    duplicateRisk,
    status,
  };
}

export function generateRecordedMedicationStatuses(
  schedule: MedicationSchedule[],
  events: OpeningEvent[],
  analysisDate: string
): DailyMedicationStatus[] {
  if (events.length === 0) {
    return [];
  }

  return schedule
    .map((item) => classifyMedicationStatus(item, events, analysisDate))
    .filter((item): item is DailyMedicationStatus => item !== null);
}

export function calculateDashboardKpis(
  statuses: DailyMedicationStatus[]
): DashboardKpi[] {
  return [
    { label: "Active", value: statuses.length },
    {
      label: "Taken",
      value: statuses.filter((item) => item.status.includes("Taken")).length,
    },
    {
      label: "Pending",
      value: 0,
    },
    {
      label: "Delayed",
      value: statuses.filter((item) => item.status === "Taken - Delayed").length,
    },
    {
      label: "Missed",
      value: statuses.filter((item) => item.status === "Missed / Very Late").length,
    },
    {
      label: "Duplicate Risk",
      value: statuses.filter((item) => item.duplicateRisk).length,
    },
  ];
}
