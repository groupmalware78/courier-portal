import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewManifests } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

const patchSchema = z.object({
  paid: z.boolean(),
});

// Toggles invoicePaidAt — null (outstanding) or now() (paid). See
// PortalInvoice's identical convention on its own invoicePaidAt.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canViewManifests(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const before = await prisma.manifest.findUnique({ where: { id }, select: { invoicePaidAt: true } });
    if (!before) {
      return NextResponse.json({ error: "Manifest not found." }, { status: 404 });
    }

    const manifest = await prisma.manifest.update({
      where: { id },
      data: { invoicePaidAt: parsed.data.paid ? new Date() : null },
      select: {
        id: true,
        generatedAt: true,
        packageCount: true,
        triggeredBy: true,
        invoiceAmount: true,
        invoiceGeneratedAt: true,
        invoiceDueDate: true,
        invoicePaidAt: true,
        company: { select: { id: true, name: true, code: true } },
      },
    });

    await recordAudit({
      entityType: "MANIFEST",
      entityId: id,
      action: "UPDATE",
      performedById: session.user.id,
      before,
      after: { invoicePaidAt: manifest.invoicePaidAt },
    });

    return NextResponse.json({ manifest });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Manifest not found." }, { status: 404 });
    }
    throw err;
  }
}
