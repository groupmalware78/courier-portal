import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManagePortal } from "@/lib/rbac";
import { locationSchema } from "@/lib/locationSchema";
import { TenantNotConfiguredError, tenantNotConfiguredResponse } from "@/lib/tenant";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { locations } = await apiClient.locations.list();
    return NextResponse.json({ locations });
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
  const parsed = locationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const { location } = await apiClient.locations.create({
      ...parsed.data,
      active: parsed.data.active ?? true,
      sortOrder: parsed.data.sortOrder ?? 0,
    });
    return NextResponse.json({ location }, { status: 201 });
  } catch (err) {
    if (err instanceof TenantNotConfiguredError) return tenantNotConfiguredResponse();
    throw err;
  }
}
