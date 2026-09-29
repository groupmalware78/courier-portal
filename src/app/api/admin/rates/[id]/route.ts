import { NextRequest, NextResponse } from "next/server";
import { isApiError } from "@/lib/apiErrors";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManagePortal } from "@/lib/rbac";
import { shippingRateSchema } from "@/lib/shippingRateSchema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = shippingRateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const { rate } = await apiClient.shippingRates.update(id, {
      ...parsed.data,
      maxWeightLbs: parsed.data.maxWeightLbs ?? null,
      sortOrder: parsed.data.sortOrder ?? 0,
    });
    return NextResponse.json({ rate });
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await apiClient.shippingRates.delete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
