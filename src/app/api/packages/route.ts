import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canViewPackages } from "@/lib/rbac";
import { TenantNotConfiguredError, tenantNotConfiguredResponse } from "@/lib/tenant";

// Lightweight client-fetchable package search — powers the fee
// calculator's "find a package" step. The staff /packages directory
// itself is fetched server-side in its own page.tsx, not through here.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canViewPackages(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ packages: [] });

  try {
    const { packages } = await apiClient.packages.list({
      q,
      ...(session.user.role === "DRIVER" ? { driverId: session.user.id } : {}),
      pageSize: 10,
    });
    return NextResponse.json({ packages });
  } catch (err) {
    if (err instanceof TenantNotConfiguredError) return tenantNotConfiguredResponse();
    throw err;
  }
}
