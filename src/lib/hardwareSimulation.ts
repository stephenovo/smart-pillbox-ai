import type { MedicationSchedule, OpeningEvent } from "../types/pillbox";

export function createOpeningEvent(
  item: MedicationSchedule,
  eventTime: string
): OpeningEvent {
  return {
    id: `${Date.now()}-${item.compartment}`,
    eventTime,
    compartment: item.compartment,
    medication: item.medication,
    eventType: "OPEN",
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