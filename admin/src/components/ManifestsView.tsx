"use client";

import { useCallback, useState } from "react";
import { Pager } from "./Pager";
import { ManifestFilters, EMPTY_MANIFEST_FILTERS, type ManifestFilterValues } from "./ManifestFilters";

interface ManifestRow {
  id: string;
  generatedAt: string;
  packageCount: number;
  triggeredBy: string;
  invoiceAmount: number | null;
  invoiceGeneratedAt: string | null;
  invoicePaidAt: string | null;
  company: { id: string; name: string; code: string };
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function ManifestsView({
  initialManifests,
  initialPagination,
  companies,
}: {
  initialManifests: ManifestRow[];
  initialPagination: Pagination;
  companies: { id: string; name: string }[];
}) {
  const [manifests, setManifests] = useState(initialManifests);
  const [pagination, setPagination] = useState(initialPagination);
  const [filters, setFilters] = useState<ManifestFilterValues>(EMPTY_MANIFEST_FILTERS);
  const [loading, setLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runQuery = useCallback(
    async (page: number, nextFilters: ManifestFilterValues) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(initialPagination.pageSize));
        if (nextFilters.companyId) params.set("companyId", nextFilters.companyId);
        if (nextFilters.dateFrom) params.set("dateFrom", nextFilters.dateFrom);
        if (nextFilters.dateTo) params.set("dateTo", nextFilters.dateTo);
        if (nextFilters.invoiceGenerated) params.set("invoiceGenerated", nextFilters.invoiceGenerated);
        const res = await fetch(`/api/manifests?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        setManifests(data.manifests as ManifestRow[]);
        setPagination(data.pagination as Pagination);
      } finally {
        setLoading(false);
      }
    },
    [initialPagination.pageSize]
  );

  const fetchPage = useCallback((page: number) => runQuery(page, filters), [runQuery, filters]);

  function handleFiltersChange(next: ManifestFilterValues) {
    setFilters(next);
    runQuery(1, next);
  }

  async function handleGenerateInvoice(manifest: ManifestRow) {
    setGeneratingId(manifest.id);
    setError(null);
    try {
      const res = await fetch(`/api/manifests/${manifest.id}/generate-invoice`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate invoice.");
        return;
      }
      setManifests((prev) => prev.map((m) => (m.id === manifest.id ? data.manifest : m)));
    } finally {
      setGeneratingId(null);
    }
  }

  async function handleTogglePaid(manifest: ManifestRow) {
    setError(null);
    const res = await fetch(`/api/manifests/${manifest.id}/paid`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: !manifest.invoicePaidAt }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to update payment status.");
      return;
    }
    setManifests((prev) => prev.map((m) => (m.id === manifest.id ? data.manifest : m)));
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manifests</h1>
        <p className="text-sm text-slate-500">
          Every manifest generated across all companies. Generate this platform&apos;s own billing
          invoice for one — packages × the company&apos;s per-package rate (set under Rates).
        </p>
      </div>

      <ManifestFilters filters={filters} companies={companies} onChange={handleFiltersChange} />

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {manifests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">
            {Object.values(filters).some((v) => v !== "")
              ? "No manifests match these filters."
              : "No manifests generated yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Generated</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Packages</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Triggered by</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {manifests.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">
                    {m.company.name}
                    <span className="ml-1 font-mono text-xs text-slate-400">{m.company.code}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {new Date(m.generatedAt).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{m.packageCount}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {m.triggeredBy === "MANUAL" ? "Manual" : "Scheduled"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {m.invoiceAmount != null ? (
                      <>
                        ${m.invoiceAmount.toFixed(2)}
                        <span className="ml-1 text-xs text-slate-400">
                          ({new Date(m.invoiceGeneratedAt!).toLocaleDateString()})
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400">Not generated</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {m.invoiceAmount != null && (
                      <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={!!m.invoicePaidAt}
                          onChange={() => handleTogglePaid(m)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        {m.invoicePaidAt ? "Paid" : "Outstanding"}
                      </label>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {m.invoiceAmount != null && (
                        <a
                          href={`/api/manifests/${m.id}/invoice`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-slate-600 transition hover:text-slate-900"
                        >
                          Download
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleGenerateInvoice(m)}
                        disabled={generatingId === m.id}
                        className="text-xs font-medium text-teal-700 transition hover:text-teal-900 disabled:opacity-50"
                      >
                        {generatingId === m.id
                          ? "Generating…"
                          : m.invoiceAmount != null
                            ? "Regenerate invoice"
                            : "Generate invoice"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            onPageChange={fetchPage}
            disabled={loading}
          />
        </div>
      )}
    </div>
  );
}
