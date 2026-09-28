import { ApiError, friendlyApiKeyErrorMessage } from "./apiErrors";
import type {
  AuthorizedPickupPerson,
  Customer,
  DeliveryAssignment,
  EmailProviderStatus,
  EmailProviderTestInput,
  EmailProviderUpdateInput,
  FaqItem,
  FeeBasis,
  FeeRange,
  Location,
  Manifest,
  Package,
  PackageStatusEvent,
  PortalSettings,
  PortalUser,
  ShippingRate,
} from "./apiTypes";

export interface ApiClientConfig {
  baseUrl: string;
  apiKey: string;
}

// Mirrors api/'s own src/lib/uploadTypes.ts (a separate app, so duplicated
// rather than shared — deliberately small and unlikely to drift, since
// both sides only need to agree on file extension → MIME).
const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  pdf: "application/pdf",
};

function contentTypeForFileName(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return (extension && EXTENSION_CONTENT_TYPES[extension]) || "application/octet-stream";
}

export interface FileDownload {
  bytes: Uint8Array;
  contentType: string;
  fileName: string | null;
}

// The ONLY way this app talks to the database — it has no Prisma client of
// its own. apiKey doubles as this deployment's tenant identifier (the
// TENANT_API_KEY value) and its server-to-server auth credential for
// api/'s /v1/** routes — see api/'s own src/lib/internalAuth.ts for why
// those are one lookup, not two.
export class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  private url(path: string, query?: Record<string, string | number | boolean | undefined>) {
    const u = new URL(`${this.baseUrl}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) u.searchParams.set(k, String(v));
      }
    }
    return u.toString();
  }

  private async json<T>(path: string, init?: RequestInit, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const res = await fetch(this.url(path, query), {
      ...init,
      headers: { "x-api-key": this.apiKey, ...(init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // non-JSON body — fall through to the status check below
    }
    if (!res.ok) {
      const message = (body as { error?: string } | null)?.error ?? `Request failed (${res.status}).`;
      throw new ApiError(friendlyApiKeyErrorMessage(message), res.status);
    }
    return body as T;
  }

  private async bytes(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<FileDownload> {
    const res = await fetch(this.url(path, query), { headers: { "x-api-key": this.apiKey } });
    if (!res.ok) {
      let message = `Request failed (${res.status}).`;
      try {
        const body = (await res.json()) as { error?: string };
        message = body.error ?? message;
      } catch {
        // ignore — use the generic message
      }
      throw new ApiError(friendlyApiKeyErrorMessage(message), res.status);
    }
    const buffer = await res.arrayBuffer();
    const disposition = res.headers.get("content-disposition");
    const fileNameMatch = disposition?.match(/filename="([^"]+)"/);
    return {
      bytes: new Uint8Array(buffer),
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
      fileName: fileNameMatch?.[1] ?? null,
    };
  }

  private async upload<T>(path: string, fields: Record<string, string | undefined>, files: Record<string, { bytes: Uint8Array; fileName: string }>): Promise<T> {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) form.set(k, v);
    }
    for (const [k, f] of Object.entries(files)) {
      // A Blob built with no `type` sends an empty Content-Type on the
      // multipart part, which api/'s upload routes reject outright (they
      // validate the MIME type, not just the extension) — infer it from
      // the filename so uploads actually carry a usable type.
      form.set(k, new Blob([new Uint8Array(f.bytes)], { type: contentTypeForFileName(f.fileName) }), f.fileName);
    }
    return this.json<T>(path, { method: "POST", body: form });
  }

  // ---- tenant / auth -------------------------------------------------------

  tenant = {
    resolve: () => this.json<{ companyId: string }>("/api/v1/tenant/resolve"),
    // Sends one of this tenant's own emails (verification, password
    // reset, contact form) through api/'s centralized sender, which picks
    // this tenant's configured provider (or the platform default) — see
    // api/src/lib/tenantEmailSender.ts. This app never holds a Resend/SMTP
    // client itself.
    sendEmail: (message: { to: string; subject: string; html: string; replyTo?: string }) =>
      this.json<{ sent: boolean }>("/api/v1/tenant/email/send", {
        method: "POST",
        body: JSON.stringify(message),
      }),
  };

  auth = {
    login: (email: string, password: string) =>
      this.json<{ user: PortalUser }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
  };

  // ---- customers -------------------------------------------------------

  customers = {
    list: (params?: { q?: string; page?: number; pageSize?: number }) =>
      this.json<{ customers: Customer[]; total: number; page: number; totalPages: number }>(
        "/api/v1/customers",
        undefined,
        params
      ),
    get: (id: string) => this.json<{ customer: Customer }>(`/api/v1/customers/${id}`),
    byEmail: (email: string) => this.json<{ customer: Customer | null }>("/api/v1/customers/by-email", undefined, { email }),
    create: (data: { name: string; email: string; phone?: string; trn?: string; assignCustomerCode?: boolean }) =>
      this.json<{ customer: Customer }>("/api/v1/customers", { method: "POST", body: JSON.stringify(data) }),
    stats: (params?: { since?: string }) =>
      this.json<{
        total: number;
        topCustomers: { id: string; name: string; email: string; packageCount: number }[];
        recentCreatedAt: string[];
      }>("/api/v1/customers/stats", undefined, params),
  };

  // ---- packages -------------------------------------------------------

  packages = {
    list: (params?: {
      q?: string;
      status?: string;
      statusIn?: string;
      dateFrom?: string;
      dateTo?: string;
      customerId?: string;
      trackingNumber?: string;
      driverId?: string;
      page?: number;
      pageSize?: number;
    }) => this.json<{ packages: Package[]; total: number; page: number; totalPages: number }>("/api/v1/packages", undefined, params),
    get: (id: string) => this.json<{ package: Package }>(`/api/v1/packages/${id}`),
    update: (
      id: string,
      data: Partial<{
        status: string;
        packageType: string;
        weightLbs: number | null;
        pieces: number;
        description: string | null;
        declaredValue: number | null;
        customerId: string | null;
        rate: number | null;
        cost: number | null;
        paymentStatus: string;
        amountPaid: number | null;
        changedByLabel: string;
      }>
    ) => this.json<{ package: Package }>(`/api/v1/packages/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    calculateFee: (id: string, data: { basis: FeeBasis; value: number }) =>
      this.json<{ package: Package; matchedFeeRange: FeeRange }>(`/api/v1/packages/${id}/calculate-fee`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    regenerateInvoice: (id: string) =>
      this.json<{ package: Package }>(`/api/v1/packages/${id}/regenerate-invoice`, { method: "POST" }),
    createPreAlert: (fields: {
      trackingNumber: string;
      pieces: string;
      packageType: string;
      description: string;
      weightLbs: string;
      cost?: string;
      additionalDetails?: string;
      merchantName?: string;
      customerId: string;
      changedByLabel: string;
      invoiceBytes: Uint8Array;
      invoiceFileName: string;
    }) =>
      this.upload<{ package: Package }>(
        "/api/v1/packages",
        {
          trackingNumber: fields.trackingNumber,
          pieces: fields.pieces,
          packageType: fields.packageType,
          description: fields.description,
          weightLbs: fields.weightLbs,
          cost: fields.cost,
          additionalDetails: fields.additionalDetails,
          merchantName: fields.merchantName,
          customerId: fields.customerId,
          changedByLabel: fields.changedByLabel,
        },
        { invoice: { bytes: fields.invoiceBytes, fileName: fields.invoiceFileName } }
      ),
    downloadGeneratedInvoice: (id: string) => this.bytes(`/api/v1/packages/${id}/invoice`),
    statusEvents: (id: string) => this.json<{ events: PackageStatusEvent[] }>(`/api/v1/packages/${id}/status-events`),
    stats: (params?: { since?: string }) =>
      this.json<{
        total: number;
        today: number;
        last7Days: number;
        last30Days: number;
        byStatus: Record<string, number>;
        recentCreatedAt: string[];
      }>("/api/v1/packages/stats", undefined, params),
    financialStats: () =>
      this.json<{
        packages: {
          cost: number | null;
          amountPaid: number | null;
          paymentStatus: string;
          customerId: string | null;
          createdAt: string;
          customer: { name: string; email: string } | null;
        }[];
      }>("/api/v1/packages/financial-stats"),
  };

  // ---- portal settings -------------------------------------------------------

  portalSettings = {
    get: (companyId: string) => this.json<{ settings: PortalSettings | null }>(`/api/v1/portal-settings/${companyId}`),
    update: (companyId: string, data: Record<string, unknown>) =>
      this.json<{ settings: PortalSettings }>(`/api/v1/portal-settings/${companyId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  };

  // Kept separate from portalSettings above — this group handles secrets
  // (encrypted server-side, see api/'s email-provider routes) and must
  // never round-trip through the generic get/update above.
  emailProvider = {
    get: (companyId: string) =>
      this.json<EmailProviderStatus>(`/api/v1/portal-settings/${companyId}/email-provider`),
    update: (companyId: string, data: EmailProviderUpdateInput) =>
      this.json<EmailProviderStatus>(`/api/v1/portal-settings/${companyId}/email-provider`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    test: (companyId: string, data: EmailProviderTestInput) =>
      this.json<{ sent: boolean; error?: string }>(`/api/v1/portal-settings/${companyId}/email-provider/test`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  };

  // ---- shipping rates / locations / faqs -------------------------------------------------------

  shippingRates = {
    list: () => this.json<{ rates: ShippingRate[] }>("/api/v1/shipping-rates"),
    create: (data: Omit<ShippingRate, "id">) =>
      this.json<{ rate: ShippingRate }>("/api/v1/shipping-rates", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Omit<ShippingRate, "id">) =>
      this.json<{ rate: ShippingRate }>(`/api/v1/shipping-rates/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => this.json<{ success: true }>(`/api/v1/shipping-rates/${id}`, { method: "DELETE" }),
  };

  feeRanges = {
    list: (params?: { basis?: FeeBasis }) => this.json<{ feeRanges: FeeRange[] }>("/api/v1/fee-ranges", undefined, params),
    create: (data: Omit<FeeRange, "id">) =>
      this.json<{ feeRange: FeeRange }>("/api/v1/fee-ranges", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Omit<FeeRange, "id">) =>
      this.json<{ feeRange: FeeRange }>(`/api/v1/fee-ranges/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => this.json<{ success: true }>(`/api/v1/fee-ranges/${id}`, { method: "DELETE" }),
  };

  locations = {
    list: (params?: { activeOnly?: boolean }) => this.json<{ locations: Location[] }>("/api/v1/locations", undefined, params),
    create: (data: Omit<Location, "id">) =>
      this.json<{ location: Location }>("/api/v1/locations", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Omit<Location, "id">) =>
      this.json<{ location: Location }>(`/api/v1/locations/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => this.json<{ success: true }>(`/api/v1/locations/${id}`, { method: "DELETE" }),
  };

  faqs = {
    list: (params?: { activeOnly?: boolean }) => this.json<{ faqs: FaqItem[] }>("/api/v1/faqs", undefined, params),
    create: (data: Omit<FaqItem, "id">) => this.json<{ faq: FaqItem }>("/api/v1/faqs", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Omit<FaqItem, "id">) =>
      this.json<{ faq: FaqItem }>(`/api/v1/faqs/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => this.json<{ success: true }>(`/api/v1/faqs/${id}`, { method: "DELETE" }),
  };

  // ---- portal users -------------------------------------------------------

  portalUsers = {
    list: (params?: { role?: string }) => this.json<{ users: PortalUser[] }>("/api/v1/portal-users", undefined, params),
    get: (id: string) => this.json<{ user: PortalUser }>(`/api/v1/portal-users/${id}`),
    byEmail: (email: string) => this.json<{ user: PortalUser | null }>("/api/v1/portal-users/by-email", undefined, { email }),
    create: (data: { name: string; email: string; password: string; role: string; mustChangePassword?: boolean }) =>
      this.json<{ user: PortalUser }>("/api/v1/portal-users", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      this.json<{ user: PortalUser }>(`/api/v1/portal-users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => this.json<{ success: true }>(`/api/v1/portal-users/${id}`, { method: "DELETE" }),
    changePassword: (id: string, currentPassword: string, newPassword: string) =>
      this.json<{ success: true }>(`/api/v1/portal-users/${id}/change-password`, {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    setPassword: (id: string, newPassword: string, clearMustChangePassword?: boolean) =>
      this.json<{ success: true }>(`/api/v1/portal-users/${id}/set-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword, clearMustChangePassword }),
      }),

    signup: (data: {
      firstName: string;
      middleInitial: string;
      lastName: string;
      email: string;
      password: string;
      phone: string;
      workPhone?: string;
      addressLine1: string;
      addressLine2?: string;
      cityParish: string;
      country: string;
      trn: string;
      storeLocation?: string;
    }) =>
      this.json<{ user: PortalUser; customerCode: string | null; emailVerificationToken: string }>(
        "/api/v1/portal-users/signup",
        { method: "POST", body: JSON.stringify(data) }
      ),

    requestPasswordReset: (email: string) =>
      this.json<{ token: string | null; user?: { id: string; name: string; email: string } }>(
        "/api/v1/portal-users/password-reset/request",
        { method: "POST", body: JSON.stringify({ email }) }
      ),
    consumePasswordReset: (token: string, newPassword: string) =>
      this.json<{ success: true }>("/api/v1/portal-users/password-reset/consume", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      }),

    issueEmailVerification: (portalUserId: string) =>
      this.json<{ token: string; user: { id: string; name: string; email: string } }>(
        "/api/v1/portal-users/email-verification/issue",
        { method: "POST", body: JSON.stringify({ portalUserId }) }
      ),
    consumeEmailVerification: (token: string) =>
      this.json<{ success: true }>("/api/v1/portal-users/email-verification/consume", {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
  };

  authorizedPickups = {
    list: (portalUserId: string) =>
      this.json<{ people: AuthorizedPickupPerson[] }>("/api/v1/authorized-pickups", undefined, { portalUserId }),
    create: (portalUserId: string, data: { name: string; phone?: string; relationship?: string }) =>
      this.json<{ person: AuthorizedPickupPerson }>("/api/v1/authorized-pickups", {
        method: "POST",
        body: JSON.stringify({ portalUserId, ...data }),
      }),
    delete: (id: string, portalUserId: string) =>
      this.json<{ success: true }>(`/api/v1/authorized-pickups/${id}`, { method: "DELETE" }, { portalUserId }),
  };

  // ---- manifests -------------------------------------------------------

  manifests = {
    list: (params?: { page?: number; pageSize?: number }) =>
      this.json<{ manifests: Manifest[]; total: number; page: number; totalPages: number }>(
        "/api/v1/manifests",
        undefined,
        params
      ),
    generate: (triggeredBy?: "MANUAL" | "SCHEDULE") =>
      this.json<{ manifest: Manifest }>("/api/v1/manifests/generate", {
        method: "POST",
        body: JSON.stringify({ triggeredBy }),
      }),
  };

  // ---- delivery assignments -------------------------------------------------------

  deliveryAssignments = {
    list: (params?: { driverId?: string; packageId?: string; requestedById?: string; status?: string; page?: number }) =>
      this.json<{ deliveries: DeliveryAssignment[]; total: number; page: number; totalPages: number }>(
        "/api/v1/delivery-assignments",
        undefined,
        params
      ),
    get: (id: string) => this.json<{ delivery: DeliveryAssignment }>(`/api/v1/delivery-assignments/${id}`),
    // driverId omitted → a customer's own delivery request (requestedById
    // set instead), created as REQUESTED with no driver yet; driverId
    // provided → staff assigning directly, created as ASSIGNED.
    create: (data: {
      packageId: string;
      driverId?: string;
      requestedById?: string;
      addressLine1: string;
      addressLine2?: string;
      cityParish: string;
      country: string;
    }) =>
      this.json<{ delivery: DeliveryAssignment }>("/api/v1/delivery-assignments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (
      id: string,
      data: Partial<{
        status: string;
        driverId: string | null;
        notes: string;
        addressLine1: string;
        addressLine2: string | null;
        cityParish: string;
        country: string;
      }>
    ) =>
      this.json<{ delivery: DeliveryAssignment }>(`/api/v1/delivery-assignments/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    complete: (id: string, fields: { signatureBytes: Uint8Array; photoBytes?: Uint8Array; notes?: string }) =>
      this.upload<{ delivery: DeliveryAssignment }>(
        `/api/v1/delivery-assignments/${id}/complete`,
        { notes: fields.notes },
        {
          signature: { bytes: fields.signatureBytes, fileName: "signature.png" },
          ...(fields.photoBytes ? { photo: { bytes: fields.photoBytes, fileName: "photo.jpg" } } : {}),
        }
      ),
    proof: (id: string, type: "signature" | "photo" = "signature") =>
      this.bytes(`/api/v1/delivery-assignments/${id}/proof`, { type }),
  };

  // ---- files (branding images, avatar, customer receipt) -------------------------------------------------------

  files = {
    getLogo: (companyId: string) => this.bytes(`/api/v1/files/portal-settings/${companyId}/logo`),
    uploadLogo: (companyId: string, bytes: Uint8Array, fileName: string) =>
      this.upload<{ fileName: string }>(`/api/v1/files/portal-settings/${companyId}/logo`, {}, { file: { bytes, fileName } }),
    deleteLogo: (companyId: string) =>
      this.json<{ success: true }>(`/api/v1/files/portal-settings/${companyId}/logo`, { method: "DELETE" }),

    getFavicon: (companyId: string) => this.bytes(`/api/v1/files/portal-settings/${companyId}/favicon`),
    uploadFavicon: (companyId: string, bytes: Uint8Array, fileName: string) =>
      this.upload<{ fileName: string }>(`/api/v1/files/portal-settings/${companyId}/favicon`, {}, { file: { bytes, fileName } }),
    deleteFavicon: (companyId: string) =>
      this.json<{ success: true }>(`/api/v1/files/portal-settings/${companyId}/favicon`, { method: "DELETE" }),

    getHeroImage: (companyId: string) => this.bytes(`/api/v1/files/portal-settings/${companyId}/hero-image`),
    uploadHeroImage: (companyId: string, bytes: Uint8Array, fileName: string) =>
      this.upload<{ fileName: string }>(`/api/v1/files/portal-settings/${companyId}/hero-image`, {}, { file: { bytes, fileName } }),
    deleteHeroImage: (companyId: string) =>
      this.json<{ success: true }>(`/api/v1/files/portal-settings/${companyId}/hero-image`, { method: "DELETE" }),

    getAvatar: (portalUserId: string) => this.bytes(`/api/v1/files/portal-users/${portalUserId}/avatar`),
    uploadAvatar: (portalUserId: string, bytes: Uint8Array, fileName: string) =>
      this.upload<{ fileName: string }>(`/api/v1/files/portal-users/${portalUserId}/avatar`, {}, { file: { bytes, fileName } }),
    deleteAvatar: (portalUserId: string) =>
      this.json<{ success: true }>(`/api/v1/files/portal-users/${portalUserId}/avatar`, { method: "DELETE" }),

    getPackageReceipt: (packageId: string) => this.bytes(`/api/v1/files/packages/${packageId}/receipt`),
    uploadPackageReceipt: (packageId: string, bytes: Uint8Array, fileName: string) =>
      this.upload<{ fileName: string }>(`/api/v1/files/packages/${packageId}/receipt`, {}, { file: { bytes, fileName } }),
    deletePackageReceipt: (packageId: string) =>
      this.json<{ success: true }>(`/api/v1/files/packages/${packageId}/receipt`, { method: "DELETE" }),
  };
}

function createApiClient() {
  const baseUrl = process.env.ADMIN_API_URL;
  if (!baseUrl) {
    throw new Error("ADMIN_API_URL is not set.");
  }
  const apiKey = process.env.TENANT_API_KEY;
  if (!apiKey) {
    throw new Error("TENANT_API_KEY is not set.");
  }
  return new ApiClient({ baseUrl, apiKey });
}

const globalForApiClient = globalThis as unknown as {
  apiClient: ReturnType<typeof createApiClient> | undefined;
};

export const apiClient = globalForApiClient.apiClient ?? createApiClient();

if (process.env.NODE_ENV !== "production") globalForApiClient.apiClient = apiClient;
