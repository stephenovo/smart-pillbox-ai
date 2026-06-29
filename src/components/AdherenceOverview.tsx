import type { DailyMedicationStatus, DashboardKpi } from "../types/pillbox";

type AdherenceOverviewProps = {
  kpis: DashboardKpi[];
  statuses: DailyMedicationStatus[];
};

export function AdherenceOverview({ kpis, statuses }: AdherenceOverviewProps) {
  const hasRisk = statuses.some(
    (item) =>
        item.status === "Missed / Very Late" ||
        item.status === "Opened Too Early" ||
        item.duplicateRisk
    );
  const hasDelay = statuses.some((item) => item.status === "Taken - Delayed");

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">
        3. Adherence Overview
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        This section shows rule-based medication safety status based on pillbox
        opening records.
      </p>

      {statuses.length > 0 && (
        <div
          className={
            hasRisk
              ? "mt-5 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700"
              : hasDelay
              ? "mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-medium text-amber-700"
              : "mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700"
          }
        >
          {hasRisk
            ? "Caregiver action recommended: missed / very late dose or duplicate opening risk detected."
            : hasDelay
            ? "Monitoring recommended: at least one medication was taken later than the on-time window."
            : "No urgent medication risk detected from recorded opening events."}
        </div>
      )}

      <div className="mt-5 grid grid-cols-6 gap-4">
        {kpis.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {statuses.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
          No opening records yet. The adherence dashboard will update after a
          pillbox opening event is recorded.
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3">Compartment</th>
                <th className="px-4 py-3">Medication</th>
                <th className="px-4 py-3">Scheduled</th>
                <th className="px-4 py-3">First Open</th>
                <th className="px-4 py-3">Delay</th>
                <th className="px-4 py-3">Openings</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {statuses.map((item) => (
                <tr key={item.compartment}>
                  <td className="px-4 py-3">C{item.compartment}</td>
                  <td className="px-4 py-3">{item.medication}</td>
                  <td className="px-4 py-3">{item.scheduledTime}</td>
                  <td className="px-4 py-3">{item.firstOpenTime}</td>
                  <td className="px-4 py-3">
                    {item.delayMinutes === null
                      ? "-"
                      : `${item.delayMinutes} min`}
                  </td>
                  <td className="px-4 py-3">{item.openingCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        item.status === "Missed / Very Late" ||
                        item.status === "Opened Too Early" ||
                        item.status === "Duplicate Risk"
                          ? "rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                          : item.status === "Taken - Delayed"
                          ? "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                          : "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                      }
                    >
                      {item.status}
                    </span>
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