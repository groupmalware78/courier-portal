import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManagePortal } from "@/lib/rbac";
import { emailProviderTestSchema } from "@/lib/emailProviderSchema";
import { getTenantCompanyId, TenantNotConfiguredError, tenantNotConfiguredResponse } from "@/lib/tenant";

// Sends against whatever's currently in the settings form (not
// necessarily saved yet) — see api/'s test route for why a blank
// resendApiKey/smtpPassword here falls back to the already-saved secret
// instead of requiring it be retyped just to test an unrelated change.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = emailProviderTestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  let companyId: string;
  try {
    companyId = await getTenantCompanyId();
  } catch (err) {
    if (err instanceof TenantNotConfiguredError) return tenantNotConfiguredResponse();
    throw err;
  }

  const { to, emailProvider, emailFromAddress, resendApiKey, smtpHost, smtpPort, smtpUsername, smtpSecure, smtpPassword } =
    parsed.data;

  const result = await apiClient.emailProvider.test(companyId, {
    to,
    emailProvider,
    emailFromAddress: emailFromAddress || null,
    ...(resendApiKey ? { resendApiKey } : {}),
    smtpHost: smtpHost || null,
    smtpPort: smtpPort ?? null,
    smtpUsername: smtpUsername || null,
    smtpSecure,
    ...(smtpPassword ? { smtpPassword } : {}),
  });

  return NextResponse.json(result);
}
