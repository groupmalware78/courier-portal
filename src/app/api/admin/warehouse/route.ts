import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManagePortal } from "@/lib/rbac";
import { warehouseSchema } from "@/lib/warehouseSchema";
import { getTenantCompanyId, TenantNotConfiguredError, tenantNotConfiguredResponse } from "@/lib/tenant";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = warehouseSchema.safeParse(body);
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
    warehouseName: parsed.data.warehouseName || null,
    warehouseAddressLine1: parsed.data.warehouseAddressLine1 || null,
    warehouseAddressLine2: parsed.data.warehouseAddressLine2 || null,
    warehouseCity: parsed.data.warehouseCity || null,
    warehouseState: parsed.data.warehouseState || null,
    warehouseZip: parsed.data.warehouseZip || null,
    warehouseCountry: parsed.data.warehouseCountry || null,
    warehousePhone: parsed.data.warehousePhone || null,
  });

  return NextResponse.json({ settings });
}
