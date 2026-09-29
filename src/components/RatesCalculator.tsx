"use client";

import { useMemo, useState } from "react";

interface Rate {
  id: string;
  label: string;
  minWeightLbs: number;
  maxWeightLbs: number | null;
  price: number;
}

export function RatesCalculator({ rates }: { rates: Rate[] }) {
  const [weight, setWeight] = useState("");

  const matched = useMemo(() => {
    const w = Number(weight);
    if (!weight.trim() || Number.isNaN(w) || w <= 0) return null;
    return (
      rates.find(
        (r) => w >= r.minWeightLbs && (r.maxWeightLbs == null || w <= r.maxWeightLbs)
      ) ?? null
    );
  }, [weight, rates]);

  if (rates.length === 0) return null;

  return (
    <section id="rates" className="mx-auto max-w-3xl scroll-mt-8 px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        <h2 className="text-xl font-semibold text-slate-900">Shipping Rates</h2>
        <p className="mt-1 text-sm text-slate-500">
          Transparent, weight-based pricing — enter a weight for an instant quote.
        </p>
      </div>

      <div className="mx-auto mb-8 max-w-sm">
        <label htmlFor="calc-weight" className="mb-1 block text-sm font-medium text-slate-700">
          Package weight (lbs)
        </label>
        <div className="flex gap-2">
          <input
            id="calc-weight"
            type="number"
            min="0"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g. 5"
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
          />
          <button
            type="button"
            onClick={() => setWeight("")}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
          >
            Clear
          </button>
        </div>
        {weight.trim() && (
          <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm">
            {matched ? (
              <p className="text-teal-800">
                <span className="font-semibold">{matched.label}</span> — estimated cost{" "}
                <span className="font-semibold">${matched.price.toFixed(2)}</span>
              </p>
            ) : (
              <p className="text-teal-800">
                That weight is outside our standard rates — please reach out for a custom quote.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Service</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Weight range</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rates.map((rate) => (
              <tr key={rate.id} className={matched?.id === rate.id ? "bg-teal-50/60" : undefined}>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                  {rate.label}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                  {rate.minWeightLbs} lbs {rate.maxWeightLbs != null ? `– ${rate.maxWeightLbs} lbs` : "and up"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  ${rate.price.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
