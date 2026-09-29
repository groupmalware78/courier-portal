import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManagePortal } from "@/lib/rbac";
import { getTenantCompanyId, TenantNotConfiguredError, tenantNotConfiguredResponse } from "@/lib/tenant";
import { manifestScheduleSchema } from "@/lib/manifestScheduleSchema";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = manifestScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { manifestAutoGenerate, manifestTime, manifestDays } = parsed.data;

  let companyId: string;
  try {
    companyId = await getTenantCompanyId();
  } catch (err) {
    if (err instanceof TenantNotConfiguredError) return tenantNotConfiguredResponse();
    throw err;
  }

  const { settings } = await apiClient.portalSettings.update(companyId, {
    manifestAutoGenerate,
    manifestTime: manifestTime || null,
    manifestDays,
  });

  return NextResponse.json({ settings });
}
