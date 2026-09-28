// Hand-written to match api/'s /v1/** JSON responses (dates arrive as ISO
// strings, not Date objects, same as any fetch() response). Deliberately
// not derived from @prisma/client — this app has no Prisma/database
// connection of its own at all.

export type PortalRole = "ADMIN" | "CSR" | "CUSTOMER" | "DRIVER" | "LOGGER";
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
export type PackageType = "BOX" | "BAG" | "ENVELOPE" | "OTHER";
export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";
export type DeliveryStatus = "REQUESTED" | "ASSIGNED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "FAILED";
export type FeeBasis = "WEIGHT" | "VALUE";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  trn: string | null;
  customerCode: string | null;
  companyId: string | null;
  createdAt: string;
  updatedAt: string;
  // Only present from customers.list() (powers the /customers directory's
  // "Packages" column) — not from customers.get()/byEmail()/create().
  _count?: { packages: number };
}

export interface Package {
  id: string;
  hawb: number;
  trackingNumber: string;
  status: PackageStatus;
  packageType: PackageType;
  pieces: number;
  notes: string | null;
  weightLbs: number | null;
  rate: number | null;
  cost: number | null;
  paymentStatus: PaymentStatus;
  amountPaid: number | null;
  description: string | null;
  declaredValue: number | null;
  dutyImportDuty: number | null;
  dutyStampDuty: number | null;
  dutyAdditionalStampDuty: number | null;
  dutyGct: number | null;
  dutySct: number | null;
  dutyStandardComplianceFee: number | null;
  dutyEnvironmentalLevy: number | null;
  dutyCustomsAdminFee: number | null;
  calculatedFee: number | null;
  calculatedFeeBasis: FeeBasis | null;
  calculatedFeeAt: string | null;
  invoiceFileName: string | null;
  invoiceUploadedAt: string | null;
  merchantName: string | null;
  additionalDetails: string | null;
  generatedInvoiceFileName: string | null;
  generatedInvoiceAt: string | null;
  receivedById: string | null;
  receivedAt: string | null;
  companyId: string | null;
  customerId: string | null;
  createdAt: string;
  updatedAt: string;
  // Always present (not optional) — api/'s packages routes always include
  // these three relations; null only when the package genuinely has no
  // company/customer/receivedBy set, not when the caller "forgot" to ask.
  receivedBy: { id: string; name: string; role: string } | null;
  company: { id: string; name: string; code: string } | null;
  customer: { id: string; name: string; email: string; customerCode: string | null } | null;
}

export interface PortalUser {
  id: string;
  name: string;
  email: string;
  role: PortalRole;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
  firstName: string | null;
  middleInitial: string | null;
  lastName: string | null;
  phone: string | null;
  workPhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  cityParish: string | null;
  country: string | null;
  trn: string | null;
  storeLocation: string | null;
  termsAcceptedAt: string | null;
  // Deprecated legacy filesystem-URL field, kept only for existing rows —
  // real avatar storage is avatarImage/avatarImageFileName (served via
  // files.getAvatar()/files.uploadAvatar() below, not exposed as bytes here).
  avatarUrl: string | null;
  avatarImageFileName: string | null;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  companyId: string;
}

export interface PortalSettings {
  id: string;
  companyName: string;
  logoEmoji: string;
  primaryColor: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  welcomeMessage: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  termsContent: string | null;
  privacyContent: string | null;
  updatedAt: string;
  logoImageFileName: string | null;
  faviconImageFileName: string | null;
  heroImageFileName: string | null;
  manifestAutoGenerate: boolean;
  manifestTime: string | null;
  manifestDays: string[];
  warehouseName: string | null;
  warehouseAddressLine1: string | null;
  warehouseAddressLine2: string | null;
  warehouseCity: string | null;
  warehouseState: string | null;
  warehouseZip: string | null;
  warehouseCountry: string | null;
  warehousePhone: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankRoutingNumber: string | null;
  bankBranch: string | null;
}

// Deliberately separate from PortalSettings above — see the comment on
// api/'s email-provider routes for why this group's secrets never
// round-trip through the generic portal-settings get/update.
export interface EmailProviderStatus {
  emailProvider: "RESEND" | "SMTP" | null;
  emailFromAddress: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsername: string | null;
  smtpSecure: boolean;
  hasSecretConfigured: boolean;
}

export interface EmailProviderUpdateInput {
  emailProvider: "RESEND" | "SMTP" | "PLATFORM_DEFAULT";
  emailFromAddress?: string | null;
  resendApiKey?: string;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUsername?: string | null;
  smtpSecure?: boolean;
  smtpPassword?: string;
}

export interface EmailProviderTestInput {
  to: string;
  emailProvider: "RESEND" | "SMTP";
  emailFromAddress?: string | null;
  resendApiKey?: string;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUsername?: string | null;
  smtpSecure?: boolean;
  smtpPassword?: string;
}

export interface ShippingRate {
  id: string;
  label: string;
  minWeightLbs: number;
  maxWeightLbs: number | null;
  price: number;
  sortOrder: number;
}

export interface FeeRange {
  id: string;
  basis: FeeBasis;
  label: string;
  min: number;
  max: number | null;
  fee: number;
  sortOrder: number;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  contactNumber: string;
  hoursMonFri: string;
  hoursSat: string;
  active: boolean;
  sortOrder: number;
}

export interface FaqItem {
  id: string;
  question: string;
  subheader: string | null;
  answer: string;
  active: boolean;
  sortOrder: number;
}

export interface Manifest {
  id: string;
  generatedAt: string;
  packageCount: number;
  packages: unknown;
  triggeredBy: string;
  companyId: string;
}

export interface AuthorizedPickupPerson {
  id: string;
  name: string;
  phone: string | null;
  relationship: string | null;
  createdAt: string;
  portalUserId: string;
}

export interface PackageStatusEvent {
  id: string;
  fromStatus: PackageStatus | null;
  toStatus: PackageStatus;
  changedByLabel: string;
  changedAt: string;
  packageId: string;
}

export interface DeliveryAssignment {
  id: string;
  status: DeliveryStatus;
  notes: string | null;
  assignedAt: string;
  deliveredAt: string | null;
  proofCapturedAt: string | null;
  addressLine1: string;
  addressLine2: string | null;
  cityParish: string;
  country: string;
  packageId: string;
  // Null while status is REQUESTED — a customer-requested delivery with no
  // driver assigned yet.
  driverId: string | null;
  requestedById: string | null;
  package?: {
    id?: string;
    trackingNumber: string;
    description?: string | null;
    pieces?: number;
    packageType?: string;
    customer?: { email: string } | null;
  };
  driver?: { id: string; name: string } | null;
}

export interface Paginated<T> {
  total: number;
  page: number;
  totalPages: number;
}
