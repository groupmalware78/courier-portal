import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canUseFeeCalculator } from "@/lib/rbac";
import { TenantNotConfiguredError, tenantNotConfiguredResponse } from "@/lib/tenant";

// Read-only — powers the fee calculator (admin/CSR). Managing the tiers
// themselves is ADMIN-only, via /api/admin/fees.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canUseFeeCalculator(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const basis = request.nextUrl.searchParams.get("basis") ?? undefined;

  try {
    const { feeRanges } = await apiClient.feeRanges.list(basis ? { basis: basis as "WEIGHT" | "VALUE" } : undefined);
    return NextResponse.json({ feeRanges });
  } catch (err) {
    if (err instanceof TenantNotConfiguredError) return tenantNotConfiguredResponse();
    throw err;
  }
}
