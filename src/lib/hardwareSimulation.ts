import type { MedicationSchedule, OpeningEvent } from "../types/pillbox";

export function createOpeningEvent(
  item: MedicationSchedule,
  eventTime: string
): OpeningEvent {
  const receivedAt = new Date(eventTime.replace(" ", "T") + ":00").toISOString();

  return {
    id: `${Date.now()}-${item.compartment}`,
    eventTime,
    receivedAt,
    compartment: item.compartment,
    medication: item.medication,
    eventType: "lid_open",
    source: "simulation",
    deviceId: "SOFTWARE-SIMULATOR",
    activeSlotAtEvent: item.compartment,
  };
}

export function clearOpeningEvents(): OpeningEvent[] {
  return [];
}

export function countOpeningEventsForCompartment(
  events: OpeningEvent[],
  compartment: number
): number {
  return events.filter((event) => event.compartment === compartment).length;
}

export function hasOpeningRecordForCompartment(
  events: OpeningEvent[],
  compartment: number
): boolean {
  return countOpeningEventsForCompartment(events, compartment) > 0;
}
