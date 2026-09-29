"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { PortalRole } from "@/lib/apiTypes";
import clsx from "clsx";
import {
  ROLE_LABELS,
  canManagePortal,
  canViewDeliveriesPage,
  canViewPackages,
  canViewCustomers,
  canViewReports,
  canUseFeeCalculator,
} from "@/lib/rbac";

const ICON_PROPS = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-4 w-4",
};

const SHIPMENTS_ICON = (
  <svg {...ICON_PROPS}>
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

const DELIVERY_ICON = (
  <svg {...ICON_PROPS}>
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
    <path d="M15 18H9" />
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
    <circle cx="17" cy="18" r="2" />
    <circle cx="7" cy="18" r="2" />
  </svg>
);

const RATES_ICON = (
  <svg {...ICON_PROPS}>
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const LOCATIONS_ICON = (
  <svg {...ICON_PROPS}>
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const MANIFESTS_ICON = (
  <svg {...ICON_PROPS}>
    <rect width="8" height="4" x="8" y="2" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M9 12h6" />
    <path d="M9 16h6" />
  </svg>
);

const FAQ_ICON = (
  <svg {...ICON_PROPS}>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
    <circle cx="12" cy="12" r="10" />
  </svg>
);

const SETTINGS_ICON = (
  <svg {...ICON_PROPS}>
    <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const FEE_CALCULATOR_ICON = (
  <svg {...ICON_PROPS}>
    <rect width="16" height="20" x="4" y="2" rx="2" />
    <line x1="8" x2="16" y1="6" y2="6" />
    <line x1="16" x2="16" y1="14" y2="18" />
    <path d="M16 10h.01" />
    <path d="M12 10h.01" />
    <path d="M8 10h.01" />
    <path d="M12 14h.01" />
    <path d="M8 14h.01" />
    <path d="M12 18h.01" />
    <path d="M8 18h.01" />
  </svg>
);

const FEES_ICON = (
  <svg {...ICON_PROPS}>
    <circle cx="8" cy="8" r="6" />
    <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
    <path d="M7 6h1v4" />
    <path d="m16.71 13.88.7.71-2.82 2.82" />
  </svg>
);

const CUSTOMERS_ICON = (
  <svg {...ICON_PROPS}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const STAFF_ICON = (
  <svg {...ICON_PROPS}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const REPORTS_ICON = (
  <svg {...ICON_PROPS}>
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
);

const PROFILE_ICON = (
  <svg {...ICON_PROPS}>
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 0 0-16 0" />
  </svg>
);

export function PortalNav({
  user,
  companyName,
  logoEmoji,
  logoUrl,
}: {
  user: { name?: string | null; role: PortalRole };
  companyName: string;
  logoEmoji: string;
  logoUrl?: string | null;
}) {
  const pathname = usePathname();

  // Grouped by what each section lets you DO, not by who's gated for it —
  // e.g. Customers (external tenant customers) and Staff (internal CSR/
  // Driver/Logger accounts) both land under "People" since both are
  // "who's in the system" lookups, while Manifests sits with Packages/
  // Deliveries under "Operations" since generating one is a day-to-day
  // shipping action, not a settings change.
  const groups = [
    {
      label: "Operations",
      links: [
        { href: "/packages", label: "Packages", icon: SHIPMENTS_ICON, show: canViewPackages(user.role) },
        { href: "/driver", label: "Deliveries", icon: DELIVERY_ICON, show: canViewDeliveriesPage(user.role) },
        {
          href: "/fee-calculator",
          label: "Fee Calculator",
          icon: FEE_CALCULATOR_ICON,
          show: canUseFeeCalculator(user.role),
        },
        { href: "/admin/manifests", label: "Manifests", icon: MANIFESTS_ICON, show: canManagePortal(user.role) },
      ],
    },
    {
      label: "People",
      links: [
        { href: "/customers", label: "Customers", icon: CUSTOMERS_ICON, show: canViewCustomers(user.role) },
        { href: "/admin/users", label: "Staff", icon: STAFF_ICON, show: canManagePortal(user.role) },
      ],
    },
    {
      label: "Insights",
      links: [{ href: "/reports", label: "Reports", icon: REPORTS_ICON, show: canViewReports(user.role) }],
    },
    {
      label: "Configuration",
      links: [
        { href: "/admin/rates", label: "Rates", icon: RATES_ICON, show: canManagePortal(user.role) },
        { href: "/admin/fees", label: "Fees", icon: FEES_ICON, show: canManagePortal(user.role) },
        { href: "/admin/locations", label: "Locations", icon: LOCATIONS_ICON, show: canManagePortal(user.role) },
        { href: "/admin/faqs", label: "FAQ", icon: FAQ_ICON, show: canManagePortal(user.role) },
        { href: "/admin/settings", label: "Settings", icon: SETTINGS_ICON, show: canManagePortal(user.role) },
      ],
    },
    {
      label: "Account",
      links: [
        { href: "/my-shipments", label: "My Shipments", icon: SHIPMENTS_ICON, show: user.role === "CUSTOMER" },
        { href: "/profile", label: "Account Profile", icon: PROFILE_ICON, show: true },
      ],
    },
  ]
    .map((group) => ({ ...group, links: group.links.filter((l) => l.show) }))
    .filter((group) => group.links.length > 0);

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-gradient-to-b from-teal-950 via-teal-900 to-cyan-950 shadow-xl print:hidden">
      <Link
        href="/"
        className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4 text-sm font-bold tracking-tight text-white"
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-7 w-7 rounded-lg bg-white object-contain shadow-md shadow-black/20" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-base shadow-md shadow-black/20">
            {logoEmoji}
          </span>
        )}
        <span className="truncate">{companyName}</span>
      </Link>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-teal-300/70">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                    pathname.startsWith(link.href)
                      ? "bg-white text-teal-700 shadow-lg shadow-black/20 font-semibold"
                      : "text-teal-100 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <Link
          href="/profile"
          className={clsx(
            "block rounded-md px-2 py-1.5 -mx-2 leading-tight transition hover:bg-white/10",
            pathname === "/profile" && "bg-white/10"
          )}
        >
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="text-xs text-teal-200">{ROLE_LABELS[user.role]}</p>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-3 w-full rounded-md border border-white/20 px-3 py-1.5 text-sm font-medium text-teal-100 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
