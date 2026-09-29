import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isApiError } from "@/lib/apiErrors";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManagePortal } from "@/lib/rbac";
import { passwordSchema } from "@/lib/passwordSchema";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  email: z.string().trim().email().optional(),
  role: z.enum(["CSR", "DRIVER", "LOGGER"]).optional(),
  active: z.boolean().optional(),
  password: passwordSchema.optional(),
});

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
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const { user: target } = await apiClient.portalUsers.get(id);
    // Deliberately unrestricted by active status — an already-deactivated
    // account is exactly the kind of thing an admin needs to be able to fix
    // (correct a typo'd email, reset a forgotten password) without having
    // to reactivate it first.
    if (target.role === "CUSTOMER" || target.role === "ADMIN") {
      return NextResponse.json(
        { error: "Only CSR, Driver, and Logger accounts can be managed here." },
        { status: 400 }
      );
    }

    const { name, email, role, active, password } = parsed.data;

    // An admin resetting someone else's password issues it as a temporary
    // one, same as the OTP flow — force them to pick their own.
    const { user } = await apiClient.portalUsers.update(id, {
      name,
      email,
      role,
      active,
      ...(password ? { mustChangePassword: true } : {}),
    });

    if (password) {
      await apiClient.portalUsers.setPassword(id, password, false);
    }

    // Same as the list/create endpoints: never forward internal-only
    // fields (verification/reset tokens) to the browser.
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    if (isApiError(err)) {
      if (err.status === 404) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
