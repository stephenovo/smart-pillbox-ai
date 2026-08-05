import type { HardwarePlanSlot } from "../types/hardware";
import type { OpeningEvent } from "../types/pillbox";

export const adherenceFeatureColumns = [
  "scheduled_minutes",
  "day_of_week",
  "is_weekend",
  "is_evening",
  "high_risk",
  "buffer_minutes",
  "device_online",
  "event_upload_delay_minutes",
  "history_count_7d",
  "history_taken_rate_7d",
  "history_missed_count_7d",
  "history_duplicate_count_28d",
  "history_median_delay_7d",
  "history_delay_trend_7d",
  "days_since_last_missed",
] as const;

export type AdherenceFeatureName = (typeof adherenceFeatureColumns)[number];
export type AdherenceFeatureSnapshot = Record<AdherenceFeatureName, number>;

function parseLocalDateTime(value: string): Date {
  return new Date(value.includes("T") ? value : value.replace(" ", "T") + ":00");
}

function dateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: Date, amount: number): Date {
  const result = new Date(value);
  result.setDate(result.getDate() + amount);
  return result;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function eventDelayMinutes(
  event: OpeningEvent,
  scheduledTime: string
): number {
  const openedAt = parseLocalDateTime(event.eventTime);
  const scheduledAt = parseLocalDateTime(
    `${event.eventTime.slice(0, 10)}T${scheduledTime}:00`
  );
  return Math.round((openedAt.getTime() - scheduledAt.getTime()) / 60_000);
}

export function buildAdherenceFeatureSnapshot(options: {
  slot: HardwarePlanSlot;
  scheduledAt: string;
  events: OpeningEvent[];
  observationStartedAt?: string;
  deviceOnline?: boolean;
  eventUploadDelayMinutes?: number;
}): AdherenceFeatureSnapshot {
  const scheduledAt = parseLocalDateTime(options.scheduledAt);
  const scheduledMinutes = timeToMinutes(options.slot.scheduledTime);
  const relevantEvents = options.events.filter(
    (event) =>
      event.compartment === options.slot.slotId &&
      event.eventType === "lid_open" &&
      parseLocalDateTime(event.eventTime).getTime() < scheduledAt.getTime()
  );
  const observationStart = options.observationStartedAt
    ? parseLocalDateTime(options.observationStartedAt)
    : relevantEvents.length > 0
      ? new Date(
          Math.min(
            ...relevantEvents.map((event) =>
              parseLocalDateTime(event.eventTime).getTime()
            )
          )
        )
      : scheduledAt;

  const delays: number[] = [];
  const missed: number[] = [];
  for (let offset = 7; offset >= 1; offset -= 1) {
    const day = addDays(scheduledAt, -offset);
    if (day.getTime() < observationStart.getTime()) continue;
    const key = dateKey(day);
    const dayEvents = relevantEvents
      .filter((event) => event.eventTime.startsWith(key))
      .sort(
        (left, right) =>
          parseLocalDateTime(left.eventTime).getTime() -
          parseLocalDateTime(right.eventTime).getTime()
      );
    if (dayEvents.length === 0) {
      missed.push(1);
      continue;
    }
    const delay = eventDelayMinutes(dayEvents[0], options.slot.scheduledTime);
    delays.push(delay);
    missed.push(delay > options.slot.bufferTimeMinutes ? 1 : 0);
  }

  const recent = delays.slice(-3);
  const older = delays.slice(0, -3);
  const average = (values: number[]) =>
    values.reduce((total, value) => total + value, 0) / values.length;
  const trend =
    recent.length > 0 && older.length > 0
      ? average(recent) - average(older)
      : 0;

  const duplicateDates = new Set<string>();
  for (let offset = 28; offset >= 1; offset -= 1) {
    const key = dateKey(addDays(scheduledAt, -offset));
    if (
      relevantEvents.filter((event) => event.eventTime.startsWith(key)).length >=
      2
    ) {
      duplicateDates.add(key);
    }
  }

  let daysSinceLastMissed = 30;
  for (let offset = 1; offset <= 30; offset += 1) {
    const day = addDays(scheduledAt, -offset);
    if (day.getTime() < observationStart.getTime()) break;
    const key = dateKey(day);
    const dayEvents = relevantEvents.filter((event) =>
      event.eventTime.startsWith(key)
    );
    if (
      dayEvents.length === 0 ||
      eventDelayMinutes(dayEvents[0], options.slot.scheduledTime) >
        options.slot.bufferTimeMinutes
    ) {
      daysSinceLastMissed = offset;
      break;
    }
  }

  const historyCount = missed.length;
  const missedCount = missed.reduce((total, value) => total + value, 0);
  const mondayBasedDay = (scheduledAt.getDay() + 6) % 7;
  return {
    scheduled_minutes: scheduledMinutes,
    day_of_week: mondayBasedDay,
    is_weekend: mondayBasedDay >= 5 ? 1 : 0,
    is_evening: scheduledMinutes >= 17 * 60 ? 1 : 0,
    high_risk: options.slot.highRisk ? 1 : 0,
    buffer_minutes: options.slot.bufferTimeMinutes,
    device_online: options.deviceOnline === false ? 0 : 1,
    event_upload_delay_minutes: Math.max(
      0,
      options.eventUploadDelayMinutes ?? 0
    ),
    history_count_7d: historyCount,
    history_taken_rate_7d:
      historyCount === 0 ? 1 : round((historyCount - missedCount) / historyCount),
    history_missed_count_7d: missedCount,
    history_duplicate_count_28d: duplicateDates.size,
    history_median_delay_7d: round(median(delays)),
    history_delay_trend_7d: round(trend),
    days_since_last_missed: daysSinceLastMissed,
  };
}
