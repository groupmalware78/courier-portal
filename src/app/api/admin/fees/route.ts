import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManagePortal } from "@/lib/rbac";
import { feeRangeSchema } from "@/lib/feeRangeSchema";
import { TenantNotConfiguredError, tenantNotConfiguredResponse } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
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

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = feeRangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const { feeRange } = await apiClient.feeRanges.create({
      ...parsed.data,
      max: parsed.data.max ?? null,
      sortOrder: parsed.data.sortOrder ?? 0,
    });
    return NextResponse.json({ feeRange }, { status: 201 });
  } catch (err) {
    if (err instanceof TenantNotConfiguredError) return tenantNotConfiguredResponse();
    throw err;
  }
}
