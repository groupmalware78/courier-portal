"use client";

import { useState } from "react";
import clsx from "clsx";
import { BarChart } from "./BarChart";
import { PERIODS, PERIOD_LABELS, type Period, type SeriesPoint } from "@/lib/timeSeries";

export function ChartCard({
  title,
  series,
  color,
  format = "number",
  defaultPeriod = "monthly",
}: {
  title: string;
  series: Record<Period, SeriesPoint[]>;
  color?: string;
  format?: "number" | "currency";
  defaultPeriod?: Period;
}) {
  const [period, setPeriod] = useState<Period>(defaultPeriod);

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <div className="flex gap-1 rounded-md bg-slate-100 p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={clsx(
                "rounded px-2 py-1 text-xs font-medium transition",
                period === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <BarChart data={series[period]} color={color} format={format} />
      </div>
    </div>
  );
}
