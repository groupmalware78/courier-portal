import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isApiError } from "@/lib/apiErrors";
import type { PortalUser } from "@/lib/apiTypes";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManagePortal } from "@/lib/rbac";
import { passwordSchema } from "@/lib/passwordSchema";

const createStaffSchema = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().email(),
  password: passwordSchema,
  role: z.enum(["CSR", "DRIVER", "LOGGER"]),
});

// The internal API's PortalUser record carries verification/reset tokens
// that must never reach the browser — trim to what the staff-management UI
// actually needs before returning.
function toStaffRow(user: PortalUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { users: csr } = await apiClient.portalUsers.list({ role: "CSR" });
  const { users: drivers } = await apiClient.portalUsers.list({ role: "DRIVER" });
  const { users: loggers } = await apiClient.portalUsers.list({ role: "LOGGER" });
  const users = [...csr, ...drivers, ...loggers]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(toStaffRow);

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const { user } = await apiClient.portalUsers.create(parsed.data);
    return NextResponse.json({ user: toStaffRow(user) }, { status: 201 });
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
