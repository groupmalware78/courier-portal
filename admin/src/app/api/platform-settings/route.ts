import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBanking, canManageRates, canManagePortalFee } from "@/lib/rbac";

const PLATFORM_SETTINGS_ID = "platform";

// Singleton settings, shared by three otherwise-unrelated screens: the
// global per-package rate (/dashboard/rates, canManageRates), the invoice
// due-date term (/dashboard/banking, canManageBanking), and the flat
// portal-lease fee applied to every company alike (/dashboard/portal-fees,
// canManagePortalFee) — banking info itself moved to its own
// /api/bank-accounts, since multiple are allowed (see PlatformBankAccount
// in schema.prisma). Not company-scoped, so no [id] param and no audit log
// entry (AuditLog is entity-scoped to PACKAGE/COMPANY/CUSTOMER/USER/
// MANIFEST/PORTAL_INVOICE; this operator-only settings screen doesn't fit
// any of those and isn't user data).
export async function GET() {
  const session = await auth();
  if (
    !session?.user ||
    !(canManageBanking(session.user.role) || canManageRates(session.user.role) || canManagePortalFee(session.user.role))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await prisma.platformSettings.findUnique({ where: { id: PLATFORM_SETTINGS_ID } });
  return NextResponse.json({ settings });
}

const patchSchema = z.object({
  perPackageRate: z.coerce.number().min(0, "Rate must be 0 or more").optional(),
  // Leave unset/null for no due date on future invoices.
  paymentDueDays: z.coerce.number().int().min(0).max(365).optional().nullable(),
  portalFeeMonthly: z.coerce.number().min(0, "Fee must be 0 or more").optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  // Each field is owned by a different screen/permission — a caller may
  // only set the field(s) they're actually allowed to manage.
  if (parsed.data.perPackageRate !== undefined && !canManageRates(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (parsed.data.paymentDueDays !== undefined && !canManageBanking(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (parsed.data.portalFeeMonthly !== undefined && !canManagePortalFee(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (
    parsed.data.perPackageRate === undefined &&
    parsed.data.paymentDueDays === undefined &&
    parsed.data.portalFeeMonthly === undefined
  ) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const settings = await prisma.platformSettings.upsert({
    where: { id: PLATFORM_SETTINGS_ID },
    create: { id: PLATFORM_SETTINGS_ID, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ settings });
}
