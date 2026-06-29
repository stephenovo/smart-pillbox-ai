import type { OpeningEvent } from "../types/pillbox";

type EventLogProps = {
  events: OpeningEvent[];
};

export function EventLog({ events }: EventLogProps) {
  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">
        4. Pillbox Event Log
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Opening events simulated by the pillbox compartment buttons will appear
        here.
      </p>

      {events.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
          No pillbox opening events recorded yet.
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3">Event Time</th>
                <th className="px-4 py-3">Compartment</th>
                <th className="px-4 py-3">Medication</th>
                <th className="px-4 py-3">Event Type</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-3">{event.eventTime}</td>
                  <td className="px-4 py-3">C{event.compartment}</td>
                  <td className="px-4 py-3">{event.medication}</td>
                  <td className="px-4 py-3">{event.eventType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}