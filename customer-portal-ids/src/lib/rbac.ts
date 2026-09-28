import type { PortalRole } from "@/lib/apiTypes";

export const ROLE_LABELS: Record<PortalRole, string> = {
  ADMIN: "Administrator",
  CSR: "Customer Service Rep",
  CUSTOMER: "Customer",
  DRIVER: "Driver",
  LOGGER: "Logger",
};

export const ROLES: PortalRole[] = ["ADMIN", "CSR", "CUSTOMER", "DRIVER", "LOGGER"];

// Roles allowed to customize this instance's CMS branding and manage staff
// accounts (CSR/Driver). Customer accounts are self-registered, not
// admin-created, so they're not managed here.
export const CAN_MANAGE_PORTAL: PortalRole[] = ["ADMIN"];

// Roles allowed to see and act on delivery assignments — progressing a
// delivery's status (out for delivery / delivered / failed) and, for
// ADMIN, viewing every delivery for the tenant. Assigning a driver to a
// REQUESTED delivery is a separate permission (see canAssignDeliveries
// below) so CSR can do that without gaining driver-only status actions.
export const CAN_MANAGE_DELIVERIES: PortalRole[] = ["ADMIN", "DRIVER"];

// Roles allowed to assign a customer-requested delivery to a driver (the
// /driver page's "all deliveries" view, reached by both this and
// canManageDeliveries).
export const CAN_ASSIGN_DELIVERIES: PortalRole[] = ["ADMIN", "CSR"];

// Roles allowed to browse the packages list. Admin/CSR/Logger see every
// package for this tenant; Drivers see only packages assigned to them
// (enforced by the query, not this check) — Customers already have "My
// Shipments".
export const CAN_VIEW_PACKAGES: PortalRole[] = ["ADMIN", "CSR", "DRIVER", "LOGGER"];

export function canManagePortal(role: PortalRole | undefined | null): boolean {
  return !!role && CAN_MANAGE_PORTAL.includes(role);
}

export function canManageDeliveries(role: PortalRole | undefined | null): boolean {
  return !!role && CAN_MANAGE_DELIVERIES.includes(role);
}

export function canAssignDeliveries(role: PortalRole | undefined | null): boolean {
  return !!role && CAN_ASSIGN_DELIVERIES.includes(role);
}

// Roles allowed to see the /driver page at all — the union of the two
// permissions above (progress-status vs. assign-driver), since ADMIN and
// DRIVER need it for one reason and CSR for the other.
export function canViewDeliveriesPage(role: PortalRole | undefined | null): boolean {
  return canManageDeliveries(role) || canAssignDeliveries(role);
}

export function canViewPackages(role: PortalRole | undefined | null): boolean {
  return !!role && CAN_VIEW_PACKAGES.includes(role);
}

// Roles allowed to browse this tenant's customer directory (/customers).
export const CAN_VIEW_CUSTOMERS: PortalRole[] = ["ADMIN", "CSR"];

export function canViewCustomers(role: PortalRole | undefined | null): boolean {
  return !!role && CAN_VIEW_CUSTOMERS.includes(role);
}

// Roles allowed to view financial/customers/packages reports for this tenant.
export const CAN_VIEW_REPORTS: PortalRole[] = ["ADMIN"];

export function canViewReports(role: PortalRole | undefined | null): boolean {
  return !!role && CAN_VIEW_REPORTS.includes(role);
}

// Roles allowed to use the fee calculator (/fee-calculator) to generate a
// fee for a package from admin-configured fee tiers. Managing the tiers
// themselves (/admin/fees) stays ADMIN-only, via canManagePortal. CSR
// doesn't touch this — their only billing lever is paymentStatus.
export const CAN_USE_FEE_CALCULATOR: PortalRole[] = ["ADMIN", "LOGGER"];

export function canUseFeeCalculator(role: PortalRole | undefined | null): boolean {
  return !!role && CAN_USE_FEE_CALCULATOR.includes(role);
}

// Roles allowed to manually regenerate a package's system invoice PDF
// from /packages' edit modal — needed when cost/duties/fee are corrected
// *after* the invoice already went out (a status change alone won't
// happen again to trigger auto-regeneration). Billing-adjacent staff
// only — not Driver, who has no billing visibility at all.
export const CAN_REGENERATE_INVOICE: PortalRole[] = ["ADMIN", "CSR", "LOGGER"];

export function canRegenerateInvoice(role: PortalRole | undefined | null): boolean {
  return !!role && CAN_REGENERATE_INVOICE.includes(role);
}

// Jamaica Customs Agency duty/fee line items a Logger can enter once a
// package's actual customs charges are known — see the comment on
// Package.declaredValue in ../../api/prisma/schema.prisma (this table is
// shared between api and admin the same way Role/User are). Each is a
// PERCENTAGE of the package's declaredValue (e.g. entering 5 means 5%),
// not a flat dollar amount — see dutyAmount() below for the dollar
// conversion, used consistently by PackageEditModal, the shipment detail
// page, and both apps' invoicePdf.ts. PackageEditModal only allows
// entering these once declaredValue is at least $100, mirroring
// https://jca.gov.jm/business/duties-and-taxes/'s own de-minimis idea.
export const DUTY_FIELDS = [
  "dutyImportDuty",
  "dutyStampDuty",
  "dutyAdditionalStampDuty",
  "dutyGct",
  "dutySct",
  "dutyStandardComplianceFee",
  "dutyEnvironmentalLevy",
  "dutyCustomsAdminFee",
] as const;
export const DUTY_FIELD_LABELS: Record<(typeof DUTY_FIELDS)[number], string> = {
  dutyImportDuty: "Import Duty",
  dutyStampDuty: "Stamp Duty",
  dutyAdditionalStampDuty: "Additional Stamp Duty",
  dutyGct: "General Consumption Tax (GCT)",
  dutySct: "Special Consumption Tax (SCT)",
  dutyStandardComplianceFee: "Standard Compliance Fee",
  dutyEnvironmentalLevy: "Environmental Levy",
  dutyCustomsAdminFee: "Customs Administrative Fee",
};

// Converts one duty's stored percentage into a dollar amount against the
// package's declared value — null (not applicable) and a missing/zero
// declared value both yield 0 rather than throwing, since callers sum
// this across every duty field regardless of whether each is set.
export function dutyAmount(percentage: number | null, declaredValue: number | null): number {
  if (percentage == null || declaredValue == null) return 0;
  return (declaredValue * percentage) / 100;
}

// The declared-value floor below which duties don't apply — matches the
// "packages valued under USD $100 disable duties" rule (see
// PackageEditModal's duty section).
export const DUTY_MIN_DECLARED_VALUE = 100;

// CSR may progress a package's status, but only to these two courier-
// facing values — marking it picked up for delivery or delivered — not
// the warehouse/customs statuses that stay Logger/Admin territory. Every
// other role with "status" in editablePackageFields (ADMIN/LOGGER/DRIVER)
// can set any status; this is the one field where CSR's permission is
// restricted by value, not just by field, so it's checked separately from
// editablePackageFields (see PackageEditModal and the packages PATCH route).
export const CSR_ALLOWED_STATUS_VALUES = ["OUT_FOR_DELIVERY", "DELIVERED"] as const;

// null means "no restriction — any status value is allowed for this
// role's status edits"; a non-null array is the exhaustive allowed set.
export function allowedStatusValues(role: PortalRole | undefined | null): readonly string[] | null {
  return role === "CSR" ? CSR_ALLOWED_STATUS_VALUES : null;
}

export const EDITABLE_PACKAGE_FIELDS = [
  "status",
  "packageType",
  "weightLbs",
  "pieces",
  "description",
  "declaredValue",
  "customerId",
  "rate",
  "cost",
  "paymentStatus",
  "amountPaid",
  ...DUTY_FIELDS,
] as const;
export type EditablePackageField = (typeof EDITABLE_PACKAGE_FIELDS)[number];

// Which package fields a role may change from /packages' edit modal.
// Admin: everything, including reassigning the customer. CSR: paymentStatus,
// plus status — though status is further restricted by value (see
// CSR_ALLOWED_STATUS_VALUES/allowedStatusValues above) to just marking a
// package out for delivery or delivered; they don't touch weight/rate/
// cost/customer (that's Logger's territory below). Logger: package
// details (status/type/weight/pieces/description/declared value/
// customer), shipping rate/cost (looked up from ShippingRate weight tiers
// — see PackageEditModal's "Look up rate from shipping rates"), and
// customs duties — everything that feeds the package's total amount to
// pay — but not paymentStatus/amountPaid themselves, which stay CSR/Admin
// territory. Driver: status only (no value restriction). Customer never
// reaches this — no edit access at all.
export function editablePackageFields(role: PortalRole | undefined | null): EditablePackageField[] {
  switch (role) {
    case "ADMIN":
      return [
        "status",
        "packageType",
        "weightLbs",
        "pieces",
        "description",
        "declaredValue",
        "customerId",
        "rate",
        "cost",
        "paymentStatus",
        "amountPaid",
        ...DUTY_FIELDS,
      ];
    case "CSR":
      return ["paymentStatus", "status"];
    case "LOGGER":
      return [
        "status",
        "packageType",
        "weightLbs",
        "pieces",
        "description",
        "declaredValue",
        "customerId",
        "rate",
        "cost",
        ...DUTY_FIELDS,
      ];
    case "DRIVER":
      return ["status"];
    default:
      return [];
  }
}

// Roles allowed to reassign a package's customer — used to gate the
// customer-picker endpoint separately from the general edit permission
// check, since it also powers the /packages picker UI.
export function canEditPackageCustomer(role: PortalRole | undefined | null): boolean {
  return editablePackageFields(role).includes("customerId");
}

// Statuses a customer-requested delivery could sensibly repeat from — an
// existing REQUESTED/ASSIGNED/OUT_FOR_DELIVERY row blocks a new request
// (one at a time), but a FAILED one (or none at all) doesn't, and DELIVERED
// packages can't be requested regardless of any delivery row.
export const ACTIVE_DELIVERY_STATUSES = ["REQUESTED", "ASSIGNED", "OUT_FOR_DELIVERY"] as const;

export function homeRouteForRole(role: PortalRole): string {
  switch (role) {
    case "ADMIN":
    case "CSR":
    case "DRIVER":
    case "LOGGER":
      return "/packages";
    case "CUSTOMER":
    default:
      return "/my-shipments";
  }
}
