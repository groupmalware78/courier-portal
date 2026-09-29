export type PackageStatus =
  | "PENDING"
  | "RECEIVED"
  | "SHIPPED"
  | "AT_CUSTOMS"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "DAMAGED"
  | "EMPTY_PACKAGE"
  | "RETURNED";

export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

const STATUS_STYLES: Record<PackageStatus, string> = {
  PENDING: "bg-slate-500 text-white shadow-sm shadow-slate-500/30",
  RECEIVED: "bg-blue-500 text-white shadow-sm shadow-blue-500/30",
  SHIPPED: "bg-teal-500 text-white shadow-sm shadow-teal-500/30",
  AT_CUSTOMS: "bg-orange-500 text-white shadow-sm shadow-orange-500/30",
  READY_FOR_PICKUP: "bg-indigo-500 text-white shadow-sm shadow-indigo-500/30",
  OUT_FOR_DELIVERY: "bg-cyan-500 text-white shadow-sm shadow-cyan-500/30",
  DELIVERED: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30",
  DAMAGED: "bg-red-500 text-white shadow-sm shadow-red-500/30",
  EMPTY_PACKAGE: "bg-amber-500 text-white shadow-sm shadow-amber-500/30",
  RETURNED: "bg-purple-500 text-white shadow-sm shadow-purple-500/30",
};

export const STATUS_LABELS: Record<PackageStatus, string> = {
  PENDING: "Pre-alert submitted",
  RECEIVED: "Received at warehouse",
  SHIPPED: "Shipped",
  AT_CUSTOMS: "At customs",
  READY_FOR_PICKUP: "Ready for pickup",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  DAMAGED: "Damaged",
  EMPTY_PACKAGE: "Empty package",
  RETURNED: "Returned",
};

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  UNPAID: "bg-red-500 text-white shadow-sm shadow-red-500/30",
  PARTIAL: "bg-amber-500 text-white shadow-sm shadow-amber-500/30",
  PAID: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  PARTIAL: "Partially paid",
  PAID: "Paid",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${PAYMENT_STATUS_STYLES[status]}`}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}

const ICON_PROPS = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-3.5 w-3.5 shrink-0",
};

export const STATUS_ICONS: Record<PackageStatus, React.ReactNode> = {
  PENDING: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  RECEIVED: (
    <svg {...ICON_PROPS}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  ),
  READY_FOR_PICKUP: (
    <svg {...ICON_PROPS}>
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  AT_CUSTOMS: (
    <svg {...ICON_PROPS}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  ),
  SHIPPED: (
    <svg {...ICON_PROPS}>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  ),
  OUT_FOR_DELIVERY: (
    <svg {...ICON_PROPS}>
      <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
      <path d="m21.854 2.147-10.94 10.939" />
    </svg>
  ),
  DELIVERED: (
    <svg {...ICON_PROPS}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  ),
  DAMAGED: (
    <svg {...ICON_PROPS}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  ),
  EMPTY_PACKAGE: (
    <svg {...ICON_PROPS}>
      <rect width="20" height="5" x="2" y="3" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </svg>
  ),
  RETURNED: (
    <svg {...ICON_PROPS}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),
};

export function StatusBadge({ status }: { status: PackageStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLES[status]}`}
    >
      {STATUS_ICONS[status]}
      {STATUS_LABELS[status]}
    </span>
  );
}
