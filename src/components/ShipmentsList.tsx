"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { StatusBadge, PaymentStatusBadge } from "./StatusBadge";
import { formatDateTime } from "@/lib/formatDateTime";
import type { Package } from "@/lib/apiTypes";

const PACKAGE_TYPE_LABELS = {
  BOX: "Box",
  BAG: "Bag",
  ENVELOPE: "Envelope",
  OTHER: "Other",
};

const ICON_PROPS = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-3.5 w-3.5 shrink-0 text-slate-400",
};

const CLOCK_ICON = (
  <svg {...ICON_PROPS}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

const PACKAGE_ICON = (
  <svg {...ICON_PROPS}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="M12 22V12" />
    <path d="m3.3 7 8.7 5 8.7-5" />
  </svg>
);

const WEIGHT_ICON = (
  <svg {...ICON_PROPS}>
    <circle cx="12" cy="5" r="3" />
    <path d="M6.5 8a2 2 0 0 0-1.905 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.925-2.54L19.4 9.5A2 2 0 0 0 17.5 8Z" />
  </svg>
);

const COST_ICON = (
  <svg {...ICON_PROPS}>
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const INVOICE_ICON = (
  <svg {...ICON_PROPS} className="h-3.5 w-3.5 shrink-0 text-emerald-500">
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="m9 15 2 2 4-4" />
  </svg>
);

const TRACKING_ICON = (
  <svg {...ICON_PROPS}>
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
    <path d="M15 18H9" />
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
    <circle cx="17" cy="18" r="2" />
    <circle cx="7" cy="18" r="2" />
  </svg>
);

const CARDS_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <rect width="7" height="7" x="3" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="14" rx="1" />
    <rect width="7" height="7" x="3" y="14" rx="1" />
  </svg>
);

const ROWS_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M3 9h18" />
    <path d="M3 15h18" />
  </svg>
);

const PRINT_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect width="12" height="8" x="6" y="14" />
  </svg>
);

type ViewMode = "cards" | "rows";
const STORAGE_KEY = "my-shipments-view";

// A tiny external store (React's documented pattern for browser-storage
// state, via useSyncExternalStore) rather than useState+useEffect — the
// remembered view is per-viewer only, but it still needs to render "cards"
// during SSR/hydration and only pick up localStorage after mount, without
// a setState-in-effect round trip.
const listeners = new Set<() => void>();

function getSnapshot(): ViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "cards" || stored === "rows") return stored;
  } catch {
    // Private browsing / blocked storage — fall back to the default view.
  }
  return "cards";
}

function getServerSnapshot(): ViewMode {
  return "cards";
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function setStoredView(next: ViewMode) {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Per-viewer convenience only — nothing to recover if it can't persist.
  }
  listeners.forEach((notify) => notify());
}

export function ShipmentsList({ packages }: { packages: Package[] }) {
  const view = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function handleSetView(next: ViewMode) {
    setStoredView(next);
  }

  const toggleButtonClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
      active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
    }`;

  return (
    <div className="space-y-3">
      <style>{`
        @media print {
          @page { size: landscape; margin: 0.5in; }
        }
      `}</style>

      <div className="flex justify-end gap-2 print:hidden">
        {view === "rows" && (
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
          >
            {PRINT_ICON}
            Print
          </button>
        )}
        <div className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => handleSetView("cards")}
            aria-pressed={view === "cards"}
            className={toggleButtonClass(view === "cards")}
          >
            {CARDS_ICON}
            Cards
          </button>
          <button
            type="button"
            onClick={() => handleSetView("rows")}
            aria-pressed={view === "rows"}
            className={toggleButtonClass(view === "rows")}
          >
            {ROWS_ICON}
            Rows
          </button>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 print:hidden ${
          view === "cards" ? "" : "hidden"
        }`}
      >
          {packages.map((pkg) => (
            <Link
              key={pkg.id}
              href={`/my-shipments/${pkg.id}`}
              className="block overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50 transition hover:border-teal-300 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-2 p-4">
                <StatusBadge status={pkg.status} />
                <PaymentStatusBadge status={pkg.paymentStatus} />
              </div>

              <div className="flex items-start p-4">
                <div className="min-w-0 flex-1">
                  {pkg.description ? (
                    <span className="inline-block rounded px-1.5 py-0.5 text-lg font-semibold text-amber-900">
                      {pkg.description}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">No description</span>
                  )}
                </div>
              </div>

              <hr className="border-t border-slate-200" />

              <dl className="space-y-1.5 p-4 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-slate-500">
                    {TRACKING_ICON}
                    Tracking
                  </dt>
                  <dd className="break-all text-right font-mono text-slate-700">
                    {pkg.trackingNumber}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-slate-500">
                    {CLOCK_ICON}
                    Last updated
                  </dt>
                  <dd className="text-right text-slate-700">
                    {formatDateTime(pkg.updatedAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-slate-500">
                    {PACKAGE_ICON}
                    Type
                  </dt>
                  <dd className="text-slate-700">{PACKAGE_TYPE_LABELS[pkg.packageType]}</dd>
                </div>
                {pkg.weightLbs != null && (
                  <div className="flex justify-between gap-2">
                    <dt className="flex items-center gap-1.5 text-slate-500">
                      {WEIGHT_ICON}
                      Weight
                    </dt>
                    <dd className="text-slate-700">{pkg.weightLbs} lbs</dd>
                  </div>
                )}
                {pkg.cost != null && (
                  <div className="flex justify-between gap-2">
                    <dt className="flex items-center gap-1.5 text-slate-500">
                      {COST_ICON}
                      Shipping cost
                    </dt>
                    <dd className="text-slate-700">${pkg.cost.toFixed(2)}</dd>
                  </div>
                )}
                {pkg.calculatedFee != null && (
                  <div className="flex justify-between gap-2">
                    <dt className="flex items-center gap-1.5 text-slate-500">
                      {COST_ICON}
                      Fee
                    </dt>
                    <dd className="text-slate-700">${pkg.calculatedFee.toFixed(2)}</dd>
                  </div>
                )}
                {pkg.generatedInvoiceFileName && (
                  <div className="flex justify-between gap-2">
                    <dt className="flex items-center gap-1.5 text-slate-500">
                      {INVOICE_ICON}
                      Invoice
                    </dt>
                    <dd className="text-emerald-600">Ready</dd>
                  </div>
                )}
              </dl>
            </Link>
          ))}
      </div>

      <div
        className={`overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50 print:overflow-visible print:rounded-none print:border-0 print:shadow-none print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact] ${
          view === "rows" ? "" : "hidden print:block"
        }`}
      >
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 print:px-2 print:py-1">
                  Tracking
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 print:px-2 print:py-1">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 print:px-2 print:py-1">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 print:px-2 print:py-1">
                  Weight
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 print:px-2 print:py-1">
                  Cost
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 print:px-2 print:py-1">
                  Last updated
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 print:px-2 print:py-1">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 print:px-2 print:py-1">
                  Payment
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {packages.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-slate-50 print:break-inside-avoid">
                  <td className="whitespace-nowrap px-4 py-3 print:px-2 print:py-1 print:whitespace-normal">
                    <Link
                      href={`/my-shipments/${pkg.id}`}
                      className="font-mono text-sm text-teal-700 hover:underline"
                    >
                      {pkg.trackingNumber}
                    </Link>
                  </td>
                  <td className="max-w-[16rem] truncate px-4 py-3 text-sm text-slate-700 print:max-w-none print:px-2 print:py-1 print:whitespace-normal print:text-xs">
                    {pkg.description || <span className="text-slate-400">No description</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 print:px-2 print:py-1 print:whitespace-normal print:text-xs">
                    {PACKAGE_TYPE_LABELS[pkg.packageType]}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 print:px-2 print:py-1 print:whitespace-normal print:text-xs">
                    {pkg.weightLbs != null ? `${pkg.weightLbs} lbs` : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 print:px-2 print:py-1 print:whitespace-normal print:text-xs">
                    {pkg.cost != null ? `$${pkg.cost.toFixed(2)}` : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 print:px-2 print:py-1 print:whitespace-normal print:text-xs">
                    {formatDateTime(pkg.updatedAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 print:px-2 print:py-1 print:whitespace-normal">
                    <StatusBadge status={pkg.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 print:px-2 print:py-1 print:whitespace-normal">
                    <PaymentStatusBadge status={pkg.paymentStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
    </div>
  );
}
