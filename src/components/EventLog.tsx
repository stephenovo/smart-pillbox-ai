import type { DailyMedicationStatus, OpeningEvent } from "../types/pillbox";

type EventLogProps = {
  events: OpeningEvent[];
  statuses?: DailyMedicationStatus[];
};

function getClassification(
  event: OpeningEvent,
  statuses: DailyMedicationStatus[]
): string {
  if (event.eventType === "wrong_slot_open") return "Wrong Slot";
  return (
    statuses.find((status) => status.compartment === event.compartment)?.status ??
    "Opening recorded"
  );
}

export function EventLog({ events, statuses = [] }: EventLogProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <header className="border-b border-stone-100 px-5 py-4">
        <p className="text-xs font-semibold uppercase text-neutral-400">Audit trail</p>
        <h2 className="mt-1 text-lg font-bold text-neutral-950">Device Event Log</h2>
      </header>

      {events.length === 0 ? (
        <div className="p-6 text-sm text-neutral-500">
          No pillbox opening events recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-stone-50 text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Event Time</th>
                <th className="px-4 py-3 font-semibold">Slot</th>
                <th className="px-4 py-3 font-semibold">Event Type</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Classification</th>
                <th className="px-4 py-3 font-semibold">Device ID</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100 bg-white">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-600">
                    {event.eventTime}
                  </td>
                  <td className="px-4 py-3 font-bold text-neutral-950">
                    {event.compartment}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {event.eventType}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                        event.source === "hardware"
                          ? "bg-teal-50 text-teal-700"
                          : "bg-stone-100 text-neutral-600"
                      }`}
                    >
                      {event.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {getClassification(event, statuses)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                    {event.deviceId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
