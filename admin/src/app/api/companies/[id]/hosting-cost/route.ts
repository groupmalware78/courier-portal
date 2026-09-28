import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManagePortalFee } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

// A company's recurring monthly hosting cost — set here, snapshotted onto
// each PortalInvoice at generation time so a later rate change never
// retroactively alters an already-generated invoice. Unlike the portal
// lease fee (PlatformSettings.portalFeeMonthly, one rate for every
// company — see /api/platform-settings), hosting cost does vary per
// company.
const patchSchema = z.object({
  hostingCostMonthly: z.coerce.number().min(0, "Must be 0 or more"),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManagePortalFee(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const before = await prisma.company.findUnique({
    where: { id },
    select: { hostingCostMonthly: true },
  });
  if (!before) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  try {
    const company = await prisma.company.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        code: true,
        hostingCostMonthly: true,
      },
    });

    await recordAudit({
      entityType: "COMPANY",
      entityId: id,
      action: "UPDATE",
      performedById: session.user.id,
      before,
      after: parsed.data,
    });

    return NextResponse.json({ company });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }
    throw err;
  }
}
