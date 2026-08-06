type CareSessionControlProps = {
  analysisDate: string;
  analysisTime: string;
  onAnalysisDateChange: (value: string) => void;
  onAnalysisTimeChange: (value: string) => void;
};

export function CareSessionControl({
  analysisDate,
  analysisTime,
  onAnalysisDateChange,
  onAnalysisTimeChange,
}: CareSessionControlProps) {
  const displayDate = analysisDate || "Not set";
  const displayTime = analysisTime || "Not set";

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-950 px-6 py-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Care Session
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Simulation Control
            </h2>
          </div>

          <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-emerald-100">
            Switch-sensor demo
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-6 lg:grid-cols-[1fr_1fr_1.25fr]">
        <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Analysis date
          </span>
          <input
            type="date"
            value={analysisDate}
            onChange={(event) => onAnalysisDateChange(event.target.value)}
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-lg font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Current analysis time
          </span>
          <input
            type="time"
            value={analysisTime}
            onChange={(event) => onAnalysisTimeChange(event.target.value)}
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-lg font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Session clock
          </p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
            {displayTime}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-600">
            {displayDate}
          </p>
        </div>
      </div>
    </section>
  );
}
