import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";
import { hashApiKey } from "./apiKeyHash";
import { checkRateLimit, RateLimitExceededError } from "./rateLimit";

// Authenticates every /v1/** call. The credential is each customer-portal
// instance's own TENANT_API_KEY, the same value already used to identify
// "which company is this deployment" — reusing it here means validating
// the key and resolving the tenant are the same lookup.
//
// The header is the ONLY thing standing between an unauthenticated caller
// and full read/write access to every table these routes expose,
// including password verification. Bind this service to a private
// network / VPC in any real deployment.
export class InternalAuthError extends Error {
  status: number;
  retryAfterSeconds?: number;
  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.name = "InternalAuthError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface InternalAuthContext {
  companyId: string;
}

const COMPANY_AUTH_SELECT = {
  id: true,
  active: true,
  apiKeyScope: true,
  requestsPerMinute: true,
} as const;

// Non-mutating endpoints that use POST for reasons other than changing
// data (here, submitting login credentials in a request body) — exempted
// from the READ_ONLY-scope write check below. Any future POST-shaped read
// must be added here explicitly; the check otherwise assumes every
// non-GET/HEAD request is a write.
const WRITE_SCOPE_EXEMPT_PATHS = new Set([
  "/api/v1/auth/login",
  "/api/v1/mobile/auth/login",
]);

export async function requireInternalAuth(request: NextRequest): Promise<InternalAuthContext> {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    throw new InternalAuthError("Missing x-api-key header.", 401);
  }

  const hash = hashApiKey(apiKey);

  const company = await prisma.company.findUnique({
    where: { apiKeyHash: hash },
    select: COMPANY_AUTH_SELECT,
  });

  if (!company) {
    throw new InternalAuthError("Invalid API key.", 401);
  }
  if (!company.active) {
    throw new InternalAuthError("This company has been deactivated.", 403);
  }

  const isWrite = !["GET", "HEAD"].includes(request.method);
  if (
    isWrite &&
    company.apiKeyScope === "READ_ONLY" &&
    !WRITE_SCOPE_EXEMPT_PATHS.has(request.nextUrl.pathname)
  ) {
    throw new InternalAuthError("This API key is read-only.", 403);
  }

  try {
    await checkRateLimit(company.id, company.requestsPerMinute);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      throw new InternalAuthError(err.message, 429, err.retryAfterSeconds);
    }
    throw err;
  }

  return { companyId: company.id };
}

export function internalAuthErrorResponse(err: unknown) {
  if (err instanceof InternalAuthError) {
    const headers = err.retryAfterSeconds ? { "Retry-After": String(err.retryAfterSeconds) } : undefined;
    return NextResponse.json({ error: err.message }, { status: err.status, headers });
  }
  throw err;
}
