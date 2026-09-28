import { Role } from "@prisma/client";

// Packages (merged in from the standalone Warehouse app — see
// CAN_LOG_PACKAGES etc. below) is the one section SCANNER/LOGGER/CSR
// accounts can reach; everything else here stays ADMIN-only.
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  SCANNER: "Scanner",
  LOGGER: "Logger",
  CSR: "Customer Service Rep",
};

export const ROLES: Role[] = ["ADMIN", "SCANNER", "LOGGER", "CSR"];

// Roles allowed to manage users (invite/edit roles).
export const CAN_MANAGE_USERS: Role[] = ["ADMIN"];

// Roles allowed to manage freight forwarder companies.
export const CAN_MANAGE_COMPANIES: Role[] = ["ADMIN"];

// Roles allowed to view the audit log.
export const CAN_VIEW_AUDIT_LOG: Role[] = ["ADMIN"];

// Roles allowed to view financial/customers/packages reports.
export const CAN_VIEW_REPORTS: Role[] = ["ADMIN"];

// Roles allowed to view manifests across every company, and generate this
// platform's own billing invoice for one.
export const CAN_VIEW_MANIFESTS: Role[] = ["ADMIN"];

// Roles allowed to set each company's per-package billing rate.
export const CAN_MANAGE_RATES: Role[] = ["ADMIN"];

// Roles allowed to manage the platform's own banking info and invoice
// due-date terms (see /dashboard/banking).
export const CAN_MANAGE_BANKING: Role[] = ["ADMIN"];

// Roles allowed to set each company's portal-lease fee and hosting cost,
// and generate/mark-paid its monthly portal invoice (see
// /dashboard/portal-fees).
export const CAN_MANAGE_PORTAL_FEE: Role[] = ["ADMIN"];

// --- Merged in from the standalone Warehouse app's own rbac.ts, later
// split from one combined WAREHOUSE_ATTENDANT role into SCANNER/LOGGER/CSR ---

// Roles allowed to log (add) packages received at the warehouse, via
// barcode scan — scanners may only add, not edit or delete.
export const CAN_LOG_PACKAGES: Role[] = ["ADMIN", "SCANNER"];

// Roles allowed to delete package records.
export const CAN_DELETE_PACKAGES: Role[] = ["ADMIN"];

// Roles allowed to edit an already-logged package's details — loggers
// locate the package by scanning its barcode (see LocatePackageModal.tsx)
// rather than browsing, then edit; they may not log new packages.
export const CAN_EDIT_PACKAGES: Role[] = ["ADMIN", "LOGGER"];

// Roles allowed to see the packages list at all — includes CSR, which has
// neither log nor edit access (read-only).
export const CAN_VIEW_PACKAGES: Role[] = ["ADMIN", "SCANNER", "LOGGER", "CSR"];

// Roles allowed to print a package's shipping label — everyone except
// scanner, whose job ends at logging a package in, not handling it
// afterward.
export const CAN_PRINT_LABELS: Role[] = ["ADMIN", "LOGGER", "CSR"];

export function canManageUsers(role: Role | undefined | null): boolean {
  return !!role && CAN_MANAGE_USERS.includes(role);
}

export function canManageCompanies(role: Role | undefined | null): boolean {
  return !!role && CAN_MANAGE_COMPANIES.includes(role);
}

export function canViewAuditLog(role: Role | undefined | null): boolean {
  return !!role && CAN_VIEW_AUDIT_LOG.includes(role);
}

export function canViewReports(role: Role | undefined | null): boolean {
  return !!role && CAN_VIEW_REPORTS.includes(role);
}

export function canViewManifests(role: Role | undefined | null): boolean {
  return !!role && CAN_VIEW_MANIFESTS.includes(role);
}

export function canManageRates(role: Role | undefined | null): boolean {
  return !!role && CAN_MANAGE_RATES.includes(role);
}

export function canManageBanking(role: Role | undefined | null): boolean {
  return !!role && CAN_MANAGE_BANKING.includes(role);
}

export function canManagePortalFee(role: Role | undefined | null): boolean {
  return !!role && CAN_MANAGE_PORTAL_FEE.includes(role);
}

export function canLogPackages(role: Role | undefined | null): boolean {
  return !!role && CAN_LOG_PACKAGES.includes(role);
}

export function canDeletePackages(role: Role | undefined | null): boolean {
  return !!role && CAN_DELETE_PACKAGES.includes(role);
}

export function canEditPackages(role: Role | undefined | null): boolean {
  return !!role && CAN_EDIT_PACKAGES.includes(role);
}

export function canViewPackages(role: Role | undefined | null): boolean {
  return !!role && CAN_VIEW_PACKAGES.includes(role);
}

export function canPrintLabels(role: Role | undefined | null): boolean {
  return !!role && CAN_PRINT_LABELS.includes(role);
}

// Roles allowed to read the customers/companies directory. Tied to
// canViewPackages, not canLog/canEdit — PackageEditModal fetches both
// directories unconditionally (to resolve the assigned customer/company's
// display name) even when rendering read-only for a CSR.
export function canViewDirectories(role: Role | undefined | null): boolean {
  return canViewPackages(role);
}

// Where a freshly-signed-in user lands — ADMIN sees the full app, every
// other role only ever has Packages to go to.
export function homeRouteForRole(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/dashboard/reports";
    default:
      return "/dashboard/packages";
  }
}
