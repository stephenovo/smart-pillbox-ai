export function Sidebar() {
  return (
    <aside className="w-72 border-r border-slate-200 bg-white p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Smart Pillbox AI</h1>
        <p className="mt-1 text-sm text-slate-500">
          Caregiver Dashboard Prototype
        </p>
      </div>

      <div className="mt-8 space-y-5">
        <div>
          <label className="text-sm font-medium text-slate-700">
            Patient name
          </label>
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            Demo Elderly User
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Caregiver
          </label>
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            Family Caregiver
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700">
            Pillbox connection
          </p>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Device connected
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl bg-blue-50 p-4">
        <h2 className="text-sm font-semibold text-blue-900">
          Safety Principle
        </h2>
        <p className="mt-2 text-sm leading-6 text-blue-800">
          Medication schedules are set by caregivers or healthcare
          professionals. AI only analyses adherence behaviour within
          caregiver-defined safety limits.
        </p>
      </div>

      <div className="mt-6 rounded-2xl bg-slate-100 p-4">
        <h2 className="text-sm font-semibold text-slate-800">Demo Notes</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This version simulates pillbox opening events. Hardware connection and
          AI adherence analysis will be added later.
        </p>
      </div>
    </aside>
  );
}