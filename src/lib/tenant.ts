import { NextResponse } from "next/server";
import { isApiError } from "@/lib/apiErrors";
import { apiClient } from "./apiClient";

// Thrown whenever this deployment can't resolve which company it belongs
// to — no TENANT_API_KEY/ADMIN_API_URL set in .env, or a key that doesn't
// match any company (e.g. deleted or regenerated in the admin app), or a
// matching company that's been deactivated. Callers can catch this
// specifically to respond gracefully instead of a raw 500.
export class TenantNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantNotConfiguredError";
  }
}

// Each deployment is one company for its entire process lifetime, set via
// TENANT_API_KEY in .env — so this is safe to call on every request, even
// concurrently across many deployments sharing this same database, since
// each process only ever resolves its own key. admin re-checks `active`
// fresh on every call (see internalAuth.ts there) so deactivating a
// company takes effect immediately without needing a restart here.
export async function getTenantCompanyId(): Promise<string> {
  if (!process.env.TENANT_API_KEY || !process.env.ADMIN_API_URL) {
    throw new TenantNotConfiguredError(
      "This deployment has no TENANT_API_KEY set. Add the key issued for this company (Companies → API Key, in the admin app) to .env and restart the server."
    );
  }

  try {
    const { companyId } = await apiClient.tenant.resolve();
    return companyId;
  } catch (err) {
    if (isApiError(err) && err.status === 401) {
      throw new TenantNotConfiguredError(
        "The TENANT_API_KEY set for this deployment doesn't match any company. It may have been regenerated in the admin app — update .env and restart the server."
      );
    }
    if (isApiError(err) && err.status === 403) {
      throw new TenantNotConfiguredError(
        "The company registered for this deployment has been deactivated in the admin app. An admin needs to reactivate it under Companies before this portal will work again."
      );
    }
    throw err;
  }
}

// For public/unauthenticated pages that should render in a degraded state
// (empty rates, no FAQs) rather than error out when this deployment isn't
// configured yet.
export async function getTenantCompanyIdOrNull(): Promise<string | null> {
  try {
    return await getTenantCompanyId();
  } catch (err) {
    if (err instanceof TenantNotConfiguredError) return null;
    throw err;
  }
}

// API routes: `if (err instanceof TenantNotConfiguredError) return tenantNotConfiguredResponse();`
// instead of letting it fall through as an unhandled 500.
export function tenantNotConfiguredResponse() {
  return NextResponse.json(
    { error: "This portal isn't configured correctly. Please contact the site administrator." },
    { status: 503 }
  );
}
