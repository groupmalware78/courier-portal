import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManagePortal } from "@/lib/rbac";
import { bankingSchema } from "@/lib/bankingSchema";
import { getTenantCompanyId, TenantNotConfiguredError, tenantNotConfiguredResponse } from "@/lib/tenant";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bankingSchema.safeParse(body);
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

  const { settings } = await apiClient.portalSettings.update(companyId, {
    bankName: parsed.data.bankName || null,
    bankAccountName: parsed.data.bankAccountName || null,
    bankAccountNumber: parsed.data.bankAccountNumber || null,
    bankRoutingNumber: parsed.data.bankRoutingNumber || null,
    bankBranch: parsed.data.bankBranch || null,
  });

  return NextResponse.json({ settings });
}
