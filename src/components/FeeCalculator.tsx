"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { FeeBasis } from "@/lib/apiTypes";

interface FeeRangeRow {
  id: string;
  basis: FeeBasis;
  label: string;
  min: number;
  max: number | null;
  fee: number;
}

interface PackageResult {
  id: string;
  trackingNumber: string;
  weightLbs: number | null;
  declaredValue: number | null;
  calculatedFee: number | null;
  calculatedFeeBasis: FeeBasis | null;
  customer: { name: string; email: string } | null;
}

const TABS: { basis: FeeBasis; label: string; unit: string; fieldLabel: string }[] = [
  { basis: "WEIGHT", label: "By Weight", unit: "lbs", fieldLabel: "Weight (lbs)" },
  { basis: "VALUE", label: "By Value", unit: "$", fieldLabel: "Declared value ($)" },
];

function defaultValueFor(basis: FeeBasis, pkg: PackageResult | null): string {
  if (!pkg) return "";
  const current = basis === "WEIGHT" ? pkg.weightLbs : pkg.declaredValue;
  return current != null ? String(current) : "";
}

export function FeeCalculator() {
  const [activeTab, setActiveTab] = useState<FeeBasis>("WEIGHT");
  // Cached per basis so switching tabs never flashes the other tab's fee
  // tiers — an entry is only added once its fetch resolves, so "not yet
  // cached" doubles as the loading state without a synchronous setState
  // in the fetch effect below.
  const [feeRangesByBasis, setFeeRangesByBasis] = useState<Partial<Record<FeeBasis, FeeRangeRow[]>>>({});

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PackageResult[]>([]);
  const [selected, setSelected] = useState<PackageResult | null>(null);

  const [value, setValue] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const tab = TABS.find((t) => t.basis === activeTab)!;
  const feeRanges = feeRangesByBasis[activeTab];

  useEffect(() => {
    if (feeRangesByBasis[activeTab] !== undefined) return;
    let cancelled = false;
    fetch(`/api/fee-ranges?basis=${activeTab}`)
      .then((res) => (res.ok ? res.json() : { feeRanges: [] }))
      .then((data) => {
        if (cancelled) return;
        setFeeRangesByBasis((prev) => ({ ...prev, [activeTab]: data.feeRanges ?? [] }));
      })
      .catch(() => {
        if (cancelled) return;
        setFeeRangesByBasis((prev) => ({ ...prev, [activeTab]: [] }));
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, feeRangesByBasis]);

  function switchTab(basis: FeeBasis) {
    setActiveTab(basis);
    setValue(defaultValueFor(basis, selected));
    setError(null);
    setSuccessMessage(null);
  }

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/packages?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(data.packages ?? []);
    } finally {
      setSearching(false);
    }
  }

  function selectPackage(pkg: PackageResult) {
    setSelected(pkg);
    setValue(defaultValueFor(activeTab, pkg));
    setResults([]);
    setQuery("");
    setError(null);
    setSuccessMessage(null);
  }

  function clearSelection() {
    setSelected(null);
    setValue("");
  }

  const matched = useMemo(() => {
    const v = Number(value);
    if (!value.trim() || Number.isNaN(v) || v <= 0 || !feeRanges) return null;
    return feeRanges.find((r) => v >= r.min && (r.max == null || v <= r.max)) ?? null;
  }, [value, feeRanges]);

  async function handleGenerate() {
    if (!selected) return;
    setGenerating(true);
    setError(null);
    setSuccessMessage(null);

    const res = await fetch(`/api/packages/${selected.id}/calculate-fee`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ basis: activeTab, value }),
    });
    const data = await res.json();
    setGenerating(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to generate fee.");
      return;
    }

    setSelected(data.package);
    setSuccessMessage(`Fee generated: $${data.matchedFeeRange.fee.toFixed(2)} (${data.matchedFeeRange.label}).`);
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fee Calculator</h1>
        <p className="text-sm text-slate-500">
          Find a package, then generate a fee from the configured weight or value tiers.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-md shadow-slate-200/50">
        <label htmlFor="fee-calc-search" className="mb-1 block text-sm font-medium text-slate-700">
          Find a package
        </label>
        <div className="flex gap-2">
          <input
            id="fee-calc-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
            placeholder="Search by tracking number or customer"
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="shrink-0 rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </div>

        {results.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-200">
            {results.map((pkg) => (
              <li key={pkg.id}>
                <button
                  type="button"
                  onClick={() => selectPackage(pkg)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                >
                  <span className="font-mono text-slate-900">{pkg.trackingNumber}</span>
                  <span className="text-slate-500">{pkg.customer?.name ?? "No customer"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!searching && query.trim() === "" && results.length === 0 && selected === null && (
          <p className="mt-2 text-xs text-slate-400">Search for a package to calculate a fee for it.</p>
        )}
      </div>

      {selected && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-sm font-semibold text-slate-900">{selected.trackingNumber}</p>
              <p className="text-xs text-slate-500">{selected.customer?.name ?? "No customer assigned"}</p>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs font-medium text-slate-500 transition hover:text-slate-900"
            >
              Change package
            </button>
          </div>
          {selected.calculatedFee != null && (
            <p className="mt-2 text-xs text-teal-800">
              Current fee: <span className="font-semibold">${selected.calculatedFee.toFixed(2)}</span> (
              {selected.calculatedFeeBasis === "VALUE" ? "value-based" : "weight-based"})
            </p>
          )}
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.basis}
            type="button"
            onClick={() => switchTab(t.basis)}
            className={clsx(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition",
              activeTab === t.basis
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-md shadow-slate-200/50">
        {error && (
          <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        {successMessage && (
          <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</div>
        )}

        <label htmlFor="fee-calc-value" className="mb-1 block text-sm font-medium text-slate-700">
          {tab.fieldLabel}
        </label>
        <div className="flex gap-2">
          <input
            id="fee-calc-value"
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSuccessMessage(null);
            }}
            placeholder={activeTab === "WEIGHT" ? "e.g. 5" : "e.g. 50"}
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!selected || generating || !value.trim() || !matched}
            className="shrink-0 rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? "Generating…" : "Generate Fee"}
          </button>
        </div>
        {!selected && (
          <p className="mt-2 text-xs text-slate-400">Select a package above before generating a fee.</p>
        )}
        {selected && value.trim() && (
          <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm">
            {matched ? (
              <p className="text-teal-800">
                <span className="font-semibold">{matched.label}</span> — fee{" "}
                <span className="font-semibold">${matched.fee.toFixed(2)}</span>
              </p>
            ) : (
              <p className="text-teal-800">
                That {activeTab === "WEIGHT" ? "weight" : "value"} is outside every configured tier — no fee can be
                generated for it.
              </p>
            )}
          </div>
        )}
        <p className="mt-2 text-xs text-slate-400">
          Entering a new {activeTab === "WEIGHT" ? "weight" : "value"} here also updates this package&apos;s{" "}
          {activeTab === "WEIGHT" ? "weight" : "declared value"}.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Label</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {activeTab === "WEIGHT" ? "Weight range" : "Value range"}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Fee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {feeRanges === undefined ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : feeRanges.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-400">
                  No {tab.label.toLowerCase()} fee tiers configured yet.
                </td>
              </tr>
            ) : (
              feeRanges.map((range) => (
                <tr key={range.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">{range.label}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {activeTab === "WEIGHT" ? `${range.min} lbs` : `$${range.min.toFixed(2)}`} –{" "}
                    {range.max != null ? (activeTab === "WEIGHT" ? `${range.max} lbs` : `$${range.max.toFixed(2)}`) : "up"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">${range.fee.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
