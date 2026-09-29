import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManagePortal } from "@/lib/rbac";
import { emailProviderSchema } from "@/lib/emailProviderSchema";
import { getTenantCompanyId, TenantNotConfiguredError, tenantNotConfiguredResponse } from "@/lib/tenant";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = emailProviderSchema.safeParse(body);
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

  const { emailProvider, emailFromAddress, resendApiKey, smtpHost, smtpPort, smtpUsername, smtpSecure, smtpPassword } =
    parsed.data;

  const status = await apiClient.emailProvider.update(companyId, {
    emailProvider,
    emailFromAddress: emailFromAddress || null,
    ...(resendApiKey ? { resendApiKey } : {}),
    smtpHost: smtpHost || null,
    smtpPort: smtpPort ?? null,
    smtpUsername: smtpUsername || null,
    smtpSecure,
    ...(smtpPassword ? { smtpPassword } : {}),
  });

  return NextResponse.json({ status });
}
