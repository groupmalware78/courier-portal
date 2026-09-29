"use client";

import { useState } from "react";
import type { ManifestPackageSnapshot } from "@/lib/manifest";
import { formatDateTime } from "@/lib/formatDateTime";
import { Pager } from "./Pager";

interface ManifestRow {
  id: string;
  generatedAt: string;
  packageCount: number;
  packages: ManifestPackageSnapshot[];
  triggeredBy: string;
}

interface PaginationInfo {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

export function ManifestsView({
  initialManifests,
  pagination,
}: {
  initialManifests: ManifestRow[];
  pagination?: PaginationInfo;
}) {
  const [manifests, setManifests] = useState(initialManifests);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/manifests", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate manifest.");
        return;
      }
      setManifests((prev) => [data.manifest, ...prev]);
      setExpandedId(data.manifest.id);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manifests</h1>
          <p className="text-sm text-slate-500">
            Each manifest snapshots every RECEIVED package at the moment it&apos;s generated and
            moves them to SHIPPED.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-3 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500 disabled:opacity-60"
        >
          {generating ? "Generating…" : "Generate now"}
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {manifests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">No manifests generated yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {manifests.map((m) => {
            const expanded = expandedId === m.id;
            return (
              <div key={m.id} className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : m.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {formatDateTime(m.generatedAt)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {m.packageCount} package{m.packageCount === 1 ? "" : "s"} ·{" "}
                      {m.triggeredBy === "SCHEDULE" ? "Auto-generated" : "Generated manually"}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {expanded ? "Hide" : "View"}
                  </span>
                </button>
                {expanded && (
                  <div className="border-t border-slate-100">
                    {m.packages.length === 0 ? (
                      <p className="px-4 py-4 text-sm text-slate-500">No packages were RECEIVED at generation time.</p>
                    ) : (
                      <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tracking number</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Weight</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Received at</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {m.packages.map((pkg, i) => (
                            <tr key={`${pkg.trackingNumber}-${i}`}>
                              <td className="whitespace-nowrap px-4 py-2 font-mono text-sm text-slate-900">{pkg.trackingNumber}</td>
                              <td className="whitespace-nowrap px-4 py-2 text-sm text-slate-600">{pkg.customerName ?? "—"}</td>
                              <td className="whitespace-nowrap px-4 py-2 text-sm text-slate-600">{pkg.weightLbs != null ? `${pkg.weightLbs} lbs` : "—"}</td>
                              <td className="whitespace-nowrap px-4 py-2 text-sm text-slate-600">{formatDateTime(pkg.receivedAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pagination && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <Pager
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            searchParams={{}}
          />
        </div>
      )}
    </div>
  );
}
