"use client";

import { useState } from "react";
import clsx from "clsx";
import { formatDateTime } from "@/lib/formatDateTime";
import { Pager } from "./Pager";

type DeliveryStatus = "REQUESTED" | "ASSIGNED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "FAILED";

interface Delivery {
  id: string;
  status: DeliveryStatus;
  notes: string | null;
  assignedAt: string;
  deliveredAt: string | null;
  addressLine1: string;
  addressLine2: string | null;
  cityParish: string;
  country: string;
  package: { trackingNumber: string };
  driver: { id: string; name: string } | null;
}

const STATUS_STYLES: Record<DeliveryStatus, string> = {
  REQUESTED: "bg-purple-50 text-purple-700 ring-purple-600/20",
  ASSIGNED: "bg-slate-100 text-slate-700 ring-slate-500/20",
  OUT_FOR_DELIVERY: "bg-amber-50 text-amber-700 ring-amber-600/20",
  DELIVERED: "bg-green-50 text-green-700 ring-green-600/20",
  FAILED: "bg-red-50 text-red-700 ring-red-600/20",
};

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  REQUESTED: "Requested",
  ASSIGNED: "Assigned",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  FAILED: "Failed",
};

const NEXT_STATUS: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  ASSIGNED: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
};

function formatAddress(d: Pick<Delivery, "addressLine1" | "addressLine2" | "cityParish" | "country">): string {
  return [d.addressLine1, d.addressLine2, d.cityParish, d.country].filter(Boolean).join(", ");
}

function navigateUrl(d: Pick<Delivery, "addressLine1" | "addressLine2" | "cityParish" | "country">): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(formatAddress(d))}`;
}

interface PaginationInfo {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

export function DeliveryList({
  initialDeliveries,
  showDriverColumn,
  canAssign = false,
  canProgress = false,
  currentDriverId = null,
  availableDrivers = [],
  pagination,
}: {
  initialDeliveries: Delivery[];
  showDriverColumn: boolean;
  canAssign?: boolean;
  canProgress?: boolean;
  currentDriverId?: string | null;
  availableDrivers?: { id: string; name: string }[];
  pagination?: PaginationInfo;
}) {
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Record<string, string>>({});

  async function patchDelivery(id: string, body: Record<string, unknown>) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/deliveries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
      const data = await res.json();
      setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, ...data.assignment } : d)));
    } finally {
      setUpdatingId(null);
    }
  }

  function updateStatus(id: string, status: DeliveryStatus) {
    return patchDelivery(id, { status });
  }

  function assignDriver(id: string) {
    const driverId = selectedDriver[id];
    if (!driverId) return;
    return patchDelivery(id, { driverId });
  }

  if (deliveries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <p className="text-sm text-slate-500">No deliveries yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tracking number</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery address</th>
            {showDriverColumn && (
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Driver</th>
            )}
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {deliveries.map((delivery) => {
            const next = NEXT_STATUS[delivery.status];
            const isOwnDelivery = currentDriverId != null && delivery.driver?.id === currentDriverId;
            const showProgressActions = canProgress && (currentDriverId == null || isOwnDelivery);
            const showNavigate =
              (delivery.status === "ASSIGNED" || delivery.status === "OUT_FOR_DELIVERY") &&
              (currentDriverId == null ? canProgress : isOwnDelivery);
            return (
              <tr key={delivery.id}>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-slate-900">
                  {delivery.package.trackingNumber}
                </td>
                <td className="max-w-xs px-4 py-3 text-sm text-slate-600">{formatAddress(delivery)}</td>
                {showDriverColumn && (
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {delivery.driver?.name ?? <span className="text-slate-400">Unassigned</span>}
                  </td>
                )}
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                  {formatDateTime(delivery.assignedAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={clsx(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                      STATUS_STYLES[delivery.status]
                    )}
                  >
                    {STATUS_LABELS[delivery.status]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {canAssign && delivery.status === "REQUESTED" && (
                      <>
                        <select
                          value={selectedDriver[delivery.id] ?? ""}
                          onChange={(e) =>
                            setSelectedDriver((prev) => ({ ...prev, [delivery.id]: e.target.value }))
                          }
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                        >
                          <option value="">Select driver…</option>
                          {availableDrivers.map((driver) => (
                            <option key={driver.id} value={driver.id}>
                              {driver.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={updatingId === delivery.id || !selectedDriver[delivery.id]}
                          onClick={() => assignDriver(delivery.id)}
                          className="text-xs font-medium text-teal-700 transition hover:text-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Assign
                        </button>
                      </>
                    )}
                    {showNavigate && (
                      <a
                        href={navigateUrl(delivery)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-teal-700 transition hover:text-teal-900"
                      >
                        Navigate
                      </a>
                    )}
                    {showProgressActions && next && (
                      <button
                        type="button"
                        disabled={updatingId === delivery.id}
                        onClick={() => updateStatus(delivery.id, next)}
                        className="text-xs font-medium text-slate-600 transition hover:text-slate-900 disabled:opacity-50"
                      >
                        Mark {STATUS_LABELS[next].toLowerCase()}
                      </button>
                    )}
                    {showProgressActions && delivery.status !== "FAILED" && delivery.status !== "DELIVERED" && delivery.status !== "REQUESTED" && (
                      <button
                        type="button"
                        disabled={updatingId === delivery.id}
                        onClick={() => updateStatus(delivery.id, "FAILED")}
                        className="text-xs font-medium text-red-600 transition hover:text-red-800 disabled:opacity-50"
                      >
                        Mark failed
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {pagination && (
        <Pager
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          searchParams={{}}
        />
      )}
    </div>
  );
}
