import { addDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewManifests } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { generateManifestInvoicePdf } from "@/lib/manifestInvoicePdf";

// Generates (or regenerates) this platform's own billing invoice for one
// manifest: amount = manifest.packageCount * PlatformSettings.perPackageRate,
// at today's global rate — re-running this after the rate changes
// recalculates and overwrites the stored invoice, it doesn't preserve the
// original rate.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canViewManifests(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const manifest = await prisma.manifest.findUnique({
    where: { id },
    include: { company: true },
  });
  if (!manifest) {
    return NextResponse.json({ error: "Manifest not found." }, { status: 404 });
  }

  const generatedAt = new Date();

  const [platformSettings, bankAccounts] = await Promise.all([
    prisma.platformSettings.findUnique({ where: { id: "platform" } }),
    prisma.platformBankAccount.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { label: true, bankName: true, accountName: true, accountNumber: true, routingNumber: true, branch: true },
    }),
  ]);
  const rate = platformSettings?.perPackageRate ?? 0;
  const amount = manifest.packageCount * rate;
  const dueDate =
    platformSettings?.paymentDueDays != null ? addDays(generatedAt, platformSettings.paymentDueDays) : null;

  const pdf = await generateManifestInvoicePdf({
    manifest: { id: manifest.id, generatedAt: manifest.generatedAt, packageCount: manifest.packageCount },
    company: {
      name: manifest.company.name,
      code: manifest.company.code,
      contactName: manifest.company.contactName,
      contactEmail: manifest.company.contactEmail,
      address: manifest.company.address,
    },
    rate,
    amount,
    bankAccounts,
    dueDate,
  });
  const fileName = `manifest-invoice-${manifest.company.code}-${manifest.id.slice(-8)}.pdf`;

  const updated = await prisma.manifest.update({
    where: { id },
    data: {
      invoiceAmount: amount,
      invoicePdf: new Uint8Array(pdf),
      invoiceFileName: fileName,
      invoiceGeneratedAt: generatedAt,
      invoiceDueDate: dueDate,
      // The amount may have changed since it was last marked paid —
      // regenerating always resets to outstanding.
      invoicePaidAt: null,
    },
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
    entityId: manifest.id,
    action: "UPDATE",
    performedById: session.user.id,
    before: { invoiceAmount: manifest.invoiceAmount },
    after: { invoiceAmount: amount, rate, packageCount: manifest.packageCount },
  });

  return NextResponse.json({ manifest: updated });
}
