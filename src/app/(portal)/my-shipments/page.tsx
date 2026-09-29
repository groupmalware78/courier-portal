import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { getPortalSettings } from "@/lib/settings";
import { CreatePreAlertButton } from "@/components/CreatePreAlertButton";
import { PackageFilterTabs, type FilterCategory } from "@/components/PackageFilterTabs";
import { ShipmentsList } from "@/components/ShipmentsList";
import type { PackageStatus } from "@/lib/apiTypes";

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

const TAB_ICON_PROPS = { ...ICON_PROPS, className: "h-4 w-4 shrink-0" };

const ALL_ICON = (
  <svg {...TAB_ICON_PROPS}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="M12 22V12" />
    <path d="m3.3 7 8.7 5 8.7-5" />
  </svg>
);
const BELL_ICON = (
  <svg {...TAB_ICON_PROPS}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);
const BUILDING_ICON = (
  <svg {...TAB_ICON_PROPS}>
    <rect width="16" height="20" x="4" y="2" rx="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" />
    <path d="M16 6h.01" />
    <path d="M12 6h.01" />
    <path d="M12 10h.01" />
    <path d="M12 14h.01" />
    <path d="M16 10h.01" />
    <path d="M16 14h.01" />
    <path d="M8 10h.01" />
    <path d="M8 14h.01" />
  </svg>
);
const SHIP_ICON = (
  <svg {...TAB_ICON_PROPS}>
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
    <path d="M15 18H9" />
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
    <circle cx="17" cy="18" r="2" />
    <circle cx="7" cy="18" r="2" />
  </svg>
);
const CUSTOMS_ICON = (
  <svg {...TAB_ICON_PROPS}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
  </svg>
);
const PICKUP_ICON = (
  <svg {...TAB_ICON_PROPS}>
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const DELIVERY_ICON = (
  <svg {...TAB_ICON_PROPS}>
    <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
    <path d="m21.854 2.147-10.94 10.939" />
  </svg>
);
const DELIVERED_ICON = (
  <svg {...TAB_ICON_PROPS}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m9 11 3 3L22 4" />
  </svg>
);
const DELAYED_ICON = (
  <svg {...TAB_ICON_PROPS}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

const DELAYED_STATUSES: PackageStatus[] = ["DAMAGED", "EMPTY_PACKAGE", "RETURNED"];

export default async function MyShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const session = await auth();
  const settings = await getPortalSettings();

  const receivedLabel = settings.warehouseCity ? `Received in ${settings.warehouseCity}` : "Received";

  const categories: (FilterCategory & { statuses: PackageStatus[] | null })[] = [
    { key: "all", label: "All Packages", icon: ALL_ICON, statuses: null },
    { key: "prealerts", label: "PreAlerts", icon: BELL_ICON, statuses: ["PENDING"] },
    { key: "received", label: receivedLabel, icon: BUILDING_ICON, statuses: ["RECEIVED"] },
    { key: "shipped", label: "Shipped", icon: SHIP_ICON, statuses: ["SHIPPED"] },
    { key: "customs", label: "At Customs", icon: CUSTOMS_ICON, statuses: ["AT_CUSTOMS"] },
    { key: "pickup", label: "Ready For Pickup", icon: PICKUP_ICON, statuses: ["READY_FOR_PICKUP"] },
    { key: "delivery", label: "Out For Delivery", icon: DELIVERY_ICON, statuses: ["OUT_FOR_DELIVERY"] },
    { key: "delivered", label: "Delivered", icon: DELIVERED_ICON, statuses: ["DELIVERED"] },
    { key: "delayed", label: "Delayed", icon: DELAYED_ICON, statuses: DELAYED_STATUSES },
  ];

  const activeCategory = categories.find((c) => c.key === filter) ?? categories[0];

  const [{ customer }, { user: portalUser }] = await Promise.all([
    apiClient.customers.byEmail(session!.user.email ?? ""),
    apiClient.portalUsers.get(session!.user.id),
  ]);

  const { packages } = customer
    ? await apiClient.packages.list({
        customerId: customer.id,
        ...(activeCategory.statuses ? { statusIn: activeCategory.statuses.join(",") } : {}),
        pageSize: 500,
      })
    : { packages: [] };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Shipments</h1>
          <p className="text-sm text-slate-500">
            Shipments linked to {session!.user.email}.
          </p>
        </div>
        <div className="print:hidden">
          <CreatePreAlertButton emailVerified={!!portalUser?.emailVerified} />
        </div>
      </div>

      <div className="print:hidden">
        <PackageFilterTabs
          categories={categories}
          gradientFrom={settings.gradientFrom}
          gradientVia={settings.gradientVia}
          gradientTo={settings.gradientTo}
        />
      </div>

      {packages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">
            {activeCategory.key === "all"
              ? "No shipments found for your account yet."
              : `No shipments in "${activeCategory.label}" right now.`}
          </p>
          {activeCategory.key === "all" && (
            <p className="mt-1 text-xs text-slate-400">
              Shipments appear here once they&apos;re registered under this email address.
            </p>
          )}
        </div>
      ) : (
        <ShipmentsList packages={packages} />
      )}
    </div>
  );
}
