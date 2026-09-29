"use client";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const DAY_LABELS: Record<(typeof WEEKDAYS)[number], string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

export interface ScheduleFields {
  manifestAutoGenerate: boolean;
  manifestTime: string;
  manifestDays: Set<string>;
}

export function ManifestScheduleForm({
  value,
  onChange,
}: {
  value: ScheduleFields;
  onChange: (value: ScheduleFields) => void;
}) {
  function toggleDay(day: string) {
    const next = new Set(value.manifestDays);
    if (next.has(day)) {
      next.delete(day);
    } else {
      next.add(day);
    }
    onChange({ ...value, manifestDays: next });
  }

  const inputClass =
    "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Manifest schedule</h2>
        <p className="mt-1 text-sm text-slate-500">
          Auto-generate a manifest of RECEIVED packages, moving them to SHIPPED. Time is the
          server&apos;s local time.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={value.manifestAutoGenerate}
          onChange={(e) => onChange({ ...value, manifestAutoGenerate: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
        />
        Auto-generate manifests on a schedule
      </label>

      <div>
        <label htmlFor="manifestTime" className="mb-1 block text-sm font-medium text-slate-700">
          Time
        </label>
        <input
          id="manifestTime"
          type="time"
          value={value.manifestTime}
          onChange={(e) => onChange({ ...value, manifestTime: e.target.value })}
          className={inputClass}
        />
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-slate-700">Days of week</span>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              aria-pressed={value.manifestDays.has(day)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${value.manifestDays.has(day)
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
            >
              {DAY_LABELS[day]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
