import type { HistoricalAdherenceRecord } from "./sampleHistory";
import type { MedicationSchedule, OpeningEvent } from "../types/pillbox";

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function openingEventsToHistoricalRecords(
  events: OpeningEvent[],
  schedule: MedicationSchedule[],
  patientId = "patient-001"
): HistoricalAdherenceRecord[] {
  const groupedEvents = new Map<string, OpeningEvent[]>();

  events
    .filter((event) => event.eventType === "lid_open")
    .forEach((event) => {
      const date = event.eventTime.slice(0, 10);
      const key = `${date}:${event.compartment}`;
      const current = groupedEvents.get(key) ?? [];
      current.push(event);
      groupedEvents.set(key, current);
    });

  return Array.from(groupedEvents.entries()).flatMap(([key, grouped]) => {
    const firstEvent = [...grouped].sort((a, b) =>
      a.eventTime.localeCompare(b.eventTime)
    )[0];
    const scheduleItem = schedule.find(
      (item) => item.compartment === firstEvent.compartment
    );

    if (!scheduleItem?.scheduledTime) return [];

    const actualOpenTime = firstEvent.eventTime.slice(-5);
    const delayMinutes =
      timeToMinutes(actualOpenTime) - timeToMinutes(scheduleItem.scheduledTime);
    const ruleBasedStatus =
      grouped.length > 1
        ? "duplicate_opening"
        : delayMinutes <= 15
          ? "taken_on_time"
          : "taken_delayed";

    return [
      {
        id: `adapter-${key}`,
        patientId,
        date: firstEvent.eventTime.slice(0, 10),
        compartmentId: firstEvent.compartment,
        medicationName: scheduleItem.medication,
        scheduledTime: scheduleItem.scheduledTime,
        actualOpenTime,
        delayMinutes,
        ruleBasedStatus,
        highRisk: scheduleItem.highRisk,
      } satisfies HistoricalAdherenceRecord,
    ];
  });
}
