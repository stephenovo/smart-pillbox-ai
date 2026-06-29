import type { MedicationSchedule } from "../types/pillbox";

type InitialisationTableProps = {
  schedule: MedicationSchedule[];
  onScheduleChange: (nextSchedule: MedicationSchedule[]) => void;
  onApplyRecommendedBufferTimes: () => void;
};

export function InitialisationTable({
  schedule,
  onScheduleChange,
  onApplyRecommendedBufferTimes,
}: InitialisationTableProps) {
  function updateScheduleItem(
    compartment: number,
    field: keyof MedicationSchedule,
    value: string | number | boolean
  ) {
    const nextSchedule = schedule.map((item) => {
      if (item.compartment !== compartment) {
        return item;
      }

      return {
        ...item,
        [field]: value,
      };
    });

    onScheduleChange(nextSchedule);
  }

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            2. Initialisation
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Caregivers set medication schedule, high-risk flag, and buffer time.
          </p>
        </div>

        <button
          onClick={onApplyRecommendedBufferTimes}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Apply Recommended Buffer Times
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3">Compartment</th>
              <th className="px-4 py-3">Medication</th>
              <th className="px-4 py-3">Scheduled Time</th>
              <th className="px-4 py-3">High Risk</th>
              <th className="px-4 py-3">Buffer Time</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white">
            {schedule.map((item) => (
              <tr key={item.compartment}>
                <td className="px-4 py-3 font-medium text-slate-700">
                  C{item.compartment}
                </td>

                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={item.medication}
                    onChange={(event) =>
                      updateScheduleItem(
                        item.compartment,
                        "medication",
                        event.target.value
                      )
                    }
                    placeholder="Empty"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
                  />
                </td>

                <td className="px-4 py-3">
                  <input
                    type="time"
                    value={item.scheduledTime}
                    onChange={(event) =>
                      updateScheduleItem(
                        item.compartment,
                        "scheduledTime",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
                  />
                </td>

                <td className="px-4 py-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={item.highRisk}
                      onChange={(event) =>
                        updateScheduleItem(
                          item.compartment,
                          "highRisk",
                          event.target.checked
                        )
                      }
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    {item.highRisk ? "Yes" : "No"}
                  </label>
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={180}
                      step={5}
                      value={item.bufferTimeMinutes}
                      onChange={(event) =>
                        updateScheduleItem(
                          item.compartment,
                          "bufferTimeMinutes",
                          Number(event.target.value)
                        )
                      }
                      className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
                    />
                    <span className="text-slate-500">min</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Recommended defaults: normal medication = 60 minutes; high-risk
        medication = 30 minutes. Caregivers can still manually edit the buffer
        time.
      </p>
    </section>
  );
}