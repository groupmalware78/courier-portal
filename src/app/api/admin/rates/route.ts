import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManagePortal } from "@/lib/rbac";
import { shippingRateSchema } from "@/lib/shippingRateSchema";
import { TenantNotConfiguredError, tenantNotConfiguredResponse } from "@/lib/tenant";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { rates } = await apiClient.shippingRates.list();
    return NextResponse.json({ rates });
  } catch (err) {
    if (err instanceof TenantNotConfiguredError) return tenantNotConfiguredResponse();
    throw err;
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = shippingRateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const { rate } = await apiClient.shippingRates.create({
      ...parsed.data,
      maxWeightLbs: parsed.data.maxWeightLbs ?? null,
      sortOrder: parsed.data.sortOrder ?? 0,
    });
    return NextResponse.json({ rate }, { status: 201 });
  } catch (err) {
    if (err instanceof TenantNotConfiguredError) return tenantNotConfiguredResponse();
    throw err;
  }
}
