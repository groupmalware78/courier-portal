"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Role } from "@prisma/client";
import {
  ROLE_LABELS,
  canManageCompanies,
  canManageUsers,
  canViewAuditLog,
  canViewReports,
  canViewManifests,
  canManageRates,
  canManageBanking,
  canManagePortalFee,
  canViewPackages,
} from "@/lib/rbac";
import clsx from "clsx";

const COMPANY_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
    <path d="M10 6h4" />
    <path d="M10 10h4" />
    <path d="M10 14h4" />
    <path d="M10 18h4" />
  </svg>
);

const USERS_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const AUDIT_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M12 8v4l3 3" />
    <path d="M3.05 11a9 9 0 1 1 .5 4" />
    <path d="M3 4v7h7" />
  </svg>
);

const REPORTS_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
);

const MANIFESTS_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <rect width="8" height="4" x="8" y="2" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M9 12h6" />
    <path d="M9 16h6" />
  </svg>
);

const RATES_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const BANKING_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);

const PORTAL_FEE_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <path d="M12 14v4" />
    <path d="M10 16h4" />
  </svg>
);

// Merged in from the standalone Warehouse app's own Sidebar.
const PACKAGE_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

export function Sidebar({
  user,
}: {
  user: { name?: string | null; email?: string | null; role: Role };
}) {
  const pathname = usePathname();

  // Grouped by what each section lets you DO, not by data model — e.g.
  // Companies (external tenant orgs) and Users (internal staff) both land
  // under "Directory" since both are "who's in the system" lookups, while
  // Manifests sits with Packages under "Operations" since generating one
  // is a day-to-day shipping action, not a settings change.
  const groups = [
    {
      label: "Operations",
      links: [
        { href: "/dashboard/packages", label: "Packages", icon: PACKAGE_ICON, show: canViewPackages(user.role) },
        { href: "/dashboard/manifests", label: "Manifests", icon: MANIFESTS_ICON, show: canViewManifests(user.role) },
      ],
    },
    {
      label: "Directory",
      links: [
        { href: "/dashboard/companies", label: "Companies", icon: COMPANY_ICON, show: canManageCompanies(user.role) },
        { href: "/dashboard/users", label: "Users", icon: USERS_ICON, show: canManageUsers(user.role) },
      ],
    },
    {
      label: "Insights",
      links: [
        { href: "/dashboard/reports", label: "Reports", icon: REPORTS_ICON, show: canViewReports(user.role) },
        { href: "/dashboard/audit-log", label: "Audit Log", icon: AUDIT_ICON, show: canViewAuditLog(user.role) },
      ],
    },
    {
      label: "Billing",
      links: [
        { href: "/dashboard/rates", label: "Rates", icon: RATES_ICON, show: canManageRates(user.role) },
        { href: "/dashboard/banking", label: "Banking", icon: BANKING_ICON, show: canManageBanking(user.role) },
        { href: "/dashboard/portal-fees", label: "Portal Fee", icon: PORTAL_FEE_ICON, show: canManagePortalFee(user.role) },
      ],
    },
  ]
    .map((group) => ({ ...group, links: group.links.filter((l) => l.show) }))
    .filter((group) => group.links.length > 0);

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-gradient-to-b from-violet-950 via-violet-900 to-fuchsia-950 shadow-xl">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-violet-700 shadow-lg shadow-black/20">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
        </div>
        <span className="text-sm font-bold leading-tight tracking-tight text-white">
          SLP Xpress
          <br />
          <span className="bg-gradient-to-r from-fuchsia-300 to-amber-300 bg-clip-text text-transparent">
            Co-Loading
          </span>
        </span>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-violet-300/70">
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
                      ? "bg-white text-violet-700 shadow-lg shadow-black/20 font-semibold"
                      : "text-violet-200 hover:bg-white/10 hover:text-white"
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
        <p className="truncate text-sm font-semibold text-white">{user.name}</p>
        <p className="text-xs font-medium text-amber-300">{ROLE_LABELS[user.role]}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-3 w-full rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-violet-200 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
