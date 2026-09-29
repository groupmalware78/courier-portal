import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManagePortal } from "@/lib/rbac";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { manifests } = await apiClient.manifests.list({ pageSize: 50 });
  return NextResponse.json({ manifests });
}

export async function POST() {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { manifest } = await apiClient.manifests.generate("MANUAL");
  return NextResponse.json({ manifest }, { status: 201 });
}
