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
  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        Care Session Control
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Set the current analysis date and time for the simulated pillbox
        session.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label className="text-sm text-slate-500">Analysis date</label>
          <input
            type="date"
            value={analysisDate}
            onChange={(event) => onAnalysisDateChange(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-lg font-semibold text-slate-900"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label className="text-sm text-slate-500">
            Current analysis time
          </label>
          <input
            type="time"
            value={analysisTime}
            onChange={(event) => onAnalysisTimeChange(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-lg font-semibold text-slate-900"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Dashboard mode</p>
          <p className="mt-2 text-lg font-semibold">Demo</p>
          <p className="mt-1 text-sm text-slate-500">
            Switch-sensor simulation
          </p>
        </div>
      </div>
    </section>
  );
}