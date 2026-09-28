import { apiClient } from "./apiClient";
import type { EmailProviderStatus } from "./apiTypes";
import { getTenantCompanyId, TenantNotConfiguredError } from "./tenant";

const DEFAULT_SETTINGS = {
  id: null as string | null,
  companyName: "Your Freight Forwarder",
  logoEmoji: "📦",
  logoUrl: null as string | null,
  faviconUrl: null as string | null,
  primaryColor: "#0f172a",
  gradientFrom: "#1e1b4b",
  gradientVia: "#581c87",
  gradientTo: "#831843",
  heroImageUrl: null as string | null,
  welcomeMessage: null as string | null,
  contactEmail: null as string | null,
  contactPhone: null as string | null,
  termsContent: null as string | null,
  privacyContent: null as string | null,
  manifestAutoGenerate: false,
  manifestTime: null as string | null,
  manifestDays: [] as string[],
  warehouseName: null as string | null,
  warehouseAddressLine1: null as string | null,
  warehouseAddressLine2: null as string | null,
  warehouseCity: null as string | null,
  warehouseState: null as string | null,
  warehouseZip: null as string | null,
  warehouseCountry: null as string | null,
  warehousePhone: null as string | null,
  bankName: null as string | null,
  bankAccountName: null as string | null,
  bankAccountNumber: null as string | null,
  bankRoutingNumber: null as string | null,
  bankBranch: null as string | null,
};

// Never throws — callers that just want branding to render (root layout
// metadata, homepage, login, signup) shouldn't have to handle a
// TenantNotConfiguredError just to show a page; they fall back to
// DEFAULT_SETTINGS instead. Callers that need the resolved companyId for
// something else should call getTenantCompanyId() directly.
//
// logoUrl/faviconUrl/heroImageUrl are computed here (not raw fields from
// admin) — they used to be literal /uploads/ paths; now they're this
// deployment's own /api/branding/* proxy routes (see those route files),
// present only when admin actually has bytes stored, so every existing
// caller of getPortalSettings() (nav headers, login/signup pages, the
// homepage hero, etc.) keeps working unchanged.
export async function getPortalSettings() {
  let companyId: string;
  try {
    companyId = await getTenantCompanyId();
  } catch (err) {
    if (err instanceof TenantNotConfiguredError) return DEFAULT_SETTINGS;
    throw err;
  }

  const { settings } = await apiClient.portalSettings.get(companyId);
  if (!settings) return { ...DEFAULT_SETTINGS, id: companyId };

  return {
    ...settings,
    logoUrl: settings.logoImageFileName ? "/api/branding/logo" : null,
    faviconUrl: settings.faviconImageFileName ? "/api/branding/favicon" : null,
    heroImageUrl: settings.heroImageFileName ? "/api/branding/hero-image" : null,
  };
}

const DEFAULT_EMAIL_PROVIDER_STATUS: EmailProviderStatus = {
  emailProvider: null,
  emailFromAddress: null,
  smtpHost: null,
  smtpPort: null,
  smtpUsername: null,
  smtpSecure: true,
  hasSecretConfigured: false,
};

// Same not-throwing convention as getPortalSettings() above — the
// settings page renders a "Platform default" empty state rather than
// erroring if the tenant isn't resolvable for some reason.
export async function getEmailProviderStatus(): Promise<EmailProviderStatus> {
  let companyId: string;
  try {
    companyId = await getTenantCompanyId();
  } catch (err) {
    if (err instanceof TenantNotConfiguredError) return DEFAULT_EMAIL_PROVIDER_STATUS;
    throw err;
  }

  return apiClient.emailProvider.get(companyId);
}
