"use client";

import { useState } from "react";

interface CompanyRow {
  id: string;
  name: string;
  code: string;
  hostingCostMonthly: number;
}

interface InvoiceRow {
  id: string;
  companyId: string;
  period: string;
  portalFeeAmount: number;
  hostingCostAmount: number;
  totalAmount: number;
  invoiceGeneratedAt: string | null;
  invoiceDueDate: string | null;
  invoicePaidAt: string | null;
}

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export function PortalFeeView({
  initialCompanies,
  initialInvoices,
  initialPeriod,
  initialPortalFeeMonthly,
}: {
  initialCompanies: CompanyRow[];
  initialInvoices: InvoiceRow[];
  initialPeriod: string;
  initialPortalFeeMonthly: number;
}) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [invoicesByCompany, setInvoicesByCompany] = useState<Record<string, InvoiceRow>>(
    Object.fromEntries(initialInvoices.map((inv) => [inv.companyId, inv]))
  );
  const [period, setPeriod] = useState(initialPeriod);
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [portalFee, setPortalFee] = useState(String(initialPortalFeeMonthly));
  const [savedPortalFee, setSavedPortalFee] = useState(initialPortalFeeMonthly);
  const [savingPortalFee, setSavingPortalFee] = useState(false);
  const [portalFeeSuccess, setPortalFeeSuccess] = useState(false);
  const portalFeeDirty = portalFee !== String(savedPortalFee);

  async function handlePeriodChange(next: string) {
    setPeriod(next);
    setLoadingPeriod(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal-invoices?period=${next}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load invoices for that period.");
        return;
      }
      setInvoicesByCompany(
        Object.fromEntries((data.invoices as InvoiceRow[]).map((inv) => [inv.companyId, inv]))
      );
    } finally {
      setLoadingPeriod(false);
    }
  }

  async function handleSavePortalFee() {
    const value = Number(portalFee);
    if (Number.isNaN(value) || value < 0) {
      setError("Portal fee must be a number of 0 or more.");
      return;
    }
    setSavingPortalFee(true);
    setError(null);
    setPortalFeeSuccess(false);
    try {
      const res = await fetch("/api/platform-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalFeeMonthly: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save portal fee.");
        return;
      }
      setSavedPortalFee(data.settings.portalFeeMonthly);
      setPortalFee(String(data.settings.portalFeeMonthly));
      setPortalFeeSuccess(true);
    } finally {
      setSavingPortalFee(false);
    }
  }

  async function handleHostingCostChange(company: CompanyRow, hostingCostMonthly: number) {
    setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, hostingCostMonthly } : c)));
    setSavingId(company.id);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${company.id}/hosting-cost`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostingCostMonthly }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to save.");
        setCompanies((prev) => prev.map((c) => (c.id === company.id ? company : c)));
      }
    } finally {
      setSavingId(null);
    }
  }

  async function handleGenerate(company: CompanyRow) {
    setGeneratingId(company.id);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${company.id}/portal-invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate invoice.");
        return;
      }
      setInvoicesByCompany((prev) => ({ ...prev, [company.id]: data.invoice }));
    } finally {
      setGeneratingId(null);
    }
  }

  async function handleTogglePaid(invoice: InvoiceRow) {
    setError(null);
    const res = await fetch(`/api/portal-invoices/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: !invoice.invoicePaidAt }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to update payment status.");
      return;
    }
    setInvoicesByCompany((prev) => ({ ...prev, [invoice.companyId]: data.invoice }));
  }

  const inputClass =
    "w-24 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 focus:border-violet-500 focus:outline-none";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Portal Fee</h1>
        <p className="text-sm text-slate-500">
          One flat monthly portal-lease fee applied to every company, plus each company&apos;s own
          hosting cost — invoiced together each month, separate from Manifests&apos; per-manifest
          invoices.
        </p>
      </div>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-5">
        {portalFeeSuccess && (
          <div className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</div>
        )}
        <label htmlFor="portal-fee" className="mb-1 block text-sm font-medium text-slate-700">
          Portal lease fee ($/mo, all companies)
        </label>
        <div className="flex items-center gap-2">
          <input
            id="portal-fee"
            type="number"
            min="0"
            step="0.01"
            value={portalFee}
            onChange={(e) => {
              setPortalFeeSuccess(false);
              setPortalFee(e.target.value);
            }}
            className="w-40 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <button
            type="button"
            onClick={handleSavePortalFee}
            disabled={!portalFeeDirty || savingPortalFee}
            className="rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-md shadow-violet-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingPortalFee ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Hosting cost &amp; monthly invoice by company</h2>
        <div>
          <label htmlFor="period" className="mb-1 block text-xs font-medium text-slate-500">
            Invoice month
          </label>
          <input
            id="period"
            type="month"
            value={period}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Hosting cost ($/mo)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">This month&apos;s invoice</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Paid</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-slate-100 ${loadingPeriod ? "opacity-50" : ""}`}>
            {companies.map((c) => {
              const invoice = invoicesByCompany[c.id];
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">
                    {c.name}
                    <span className="ml-1 font-mono text-xs text-slate-400">{c.code}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={c.hostingCostMonthly}
                      disabled={savingId === c.id}
                      onChange={(e) =>
                        setCompanies((prev) =>
                          prev.map((row) =>
                            row.id === c.id ? { ...row, hostingCostMonthly: Number(e.target.value) } : row
                          )
                        )
                      }
                      onBlur={(e) => handleHostingCostChange(c, Number(e.target.value))}
                      className={inputClass}
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {invoice ? money(invoice.totalAmount) : <span className="text-slate-400">Not generated</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {invoice && (
                      <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={!!invoice.invoicePaidAt}
                          onChange={() => handleTogglePaid(invoice)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        {invoice.invoicePaidAt ? "Paid" : "Outstanding"}
                      </label>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {invoice && (
                        <a
                          href={`/api/portal-invoices/${invoice.id}/invoice`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-slate-600 transition hover:text-slate-900"
                        >
                          Download
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleGenerate(c)}
                        disabled={generatingId === c.id}
                        className="text-xs font-medium text-teal-700 transition hover:text-teal-900 disabled:opacity-50"
                      >
                        {generatingId === c.id ? "Generating…" : invoice ? "Regenerate invoice" : "Generate invoice"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
