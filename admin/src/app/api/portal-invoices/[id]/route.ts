import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManagePortalFee } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

const patchSchema = z.object({
  paid: z.boolean(),
});

// Toggles invoicePaidAt — null (outstanding) or now() (paid). See
// Manifest's identical convention on its own invoicePaidAt.
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
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const before = await prisma.portalInvoice.findUnique({ where: { id }, select: { invoicePaidAt: true } });
    if (!before) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    const invoice = await prisma.portalInvoice.update({
      where: { id },
      data: { invoicePaidAt: parsed.data.paid ? new Date() : null },
      select: {
        id: true,
        companyId: true,
        period: true,
        portalFeeAmount: true,
        hostingCostAmount: true,
        totalAmount: true,
        invoiceGeneratedAt: true,
        invoiceDueDate: true,
        invoicePaidAt: true,
      },
    });

    await recordAudit({
      entityType: "PORTAL_INVOICE",
      entityId: id,
      action: "UPDATE",
      performedById: session.user.id,
      before,
      after: { invoicePaidAt: invoice.invoicePaidAt },
    });

    return NextResponse.json({ invoice });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }
    throw err;
  }
}
