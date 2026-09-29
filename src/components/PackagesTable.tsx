"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { StatusBadge, PaymentStatusBadge } from "./StatusBadge";
import { formatDateTime } from "@/lib/formatDateTime";
import { PackageEditModal, type EditablePackageRow } from "./PackageEditModal";
import { LocatePackageModal } from "./LocatePackageModal";
import type { EditablePackageField } from "@/lib/rbac";
import type { PortalRole } from "@/lib/apiTypes";
import { Pager } from "./Pager";

interface PackageRow extends EditablePackageRow {
  receivedAt: string | null;
}

interface PaginationInfo {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

export function PackagesTable({
  initialPackages,
  editableFields,
  pagination,
  showCalculateDuties,
  role,
}: {
  initialPackages: PackageRow[];
  editableFields: EditablePackageField[];
  pagination?: PaginationInfo;
  showCalculateDuties?: boolean;
  role: PortalRole;
}) {
  const [packages, setPackages] = useState(initialPackages);
  const [selected, setSelected] = useState<PackageRow | null>(null);
  const [locateOpen, setLocateOpen] = useState(false);
  const searchParams = useSearchParams();

  const canScanToLocate = editableFields.length > 0;

  function handleUpdated(updated: EditablePackageRow) {
    setPackages((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
  }

  return (
    <>
      {canScanToLocate && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setLocateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
            Scan to edit
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tracking number
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Weight
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Received at
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Payment
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {packages.map((pkg) => (
              <tr
                key={pkg.id}
                onClick={() => setSelected(pkg)}
                className="cursor-pointer hover:bg-slate-50"
              >
                <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-slate-900">
                  {pkg.trackingNumber}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                  {pkg.customer?.name ?? <span className="text-slate-400">—</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                  {pkg.weightLbs != null ? `${pkg.weightLbs} lbs` : <span className="text-slate-400">—</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                  {pkg.receivedAt ? formatDateTime(pkg.receivedAt) : <span className="text-slate-400">—</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusBadge status={pkg.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <PaymentStatusBadge status={pkg.paymentStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagination && (
          <Pager
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            searchParams={{
              q: searchParams.get("q") ?? undefined,
              status: searchParams.get("status") ?? undefined,
              dateFrom: searchParams.get("dateFrom") ?? undefined,
              dateTo: searchParams.get("dateTo") ?? undefined,
            }}
          />
        )}
      </div>

      {selected && (
        <PackageEditModal
          pkg={selected}
          editableFields={editableFields}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          showCalculateDuties={showCalculateDuties}
          role={role}
        />
      )}

      {locateOpen && (
        <LocatePackageModal
          onClose={() => setLocateOpen(false)}
          onFound={(pkg) => {
            setLocateOpen(false);
            setSelected(pkg as PackageRow);
          }}
        />
      )}
    </>
  );
}
