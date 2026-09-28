import { addDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManagePortalFee } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { generatePortalInvoicePdf } from "@/lib/portalInvoicePdf";
import { normalizePeriod } from "@/lib/portalInvoicePeriod";

// Generates (or regenerates) this platform's own monthly billing invoice
// for one company: portalFeeAmount is snapshotted from the platform-wide
// PlatformSettings.portalFeeMonthly (same for every company), and
// hostingCostAmount from this company's own Company.hostingCostMonthly —
// see /dashboard/portal-fees. Regenerating the same period overwrites the
// existing row (amounts + PDF) rather than creating a duplicate, and
// clears invoicePaidAt back to outstanding since the amount may have
// changed.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManagePortalFee(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const period = normalizePeriod(body?.period ?? "");
  if (!period) {
    return NextResponse.json({ error: "A valid period (YYYY-MM) is required." }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  const generatedAt = new Date();

  const [platformSettings, bankAccounts, existing] = await Promise.all([
    prisma.platformSettings.findUnique({ where: { id: "platform" } }),
    prisma.platformBankAccount.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { label: true, bankName: true, accountName: true, accountNumber: true, routingNumber: true, branch: true },
    }),
    prisma.portalInvoice.findUnique({ where: { companyId_period: { companyId: id, period } } }),
  ]);

  const portalFeeAmount = platformSettings?.portalFeeMonthly ?? 0;
  const hostingCostAmount = company.hostingCostMonthly;
  const totalAmount = portalFeeAmount + hostingCostAmount;
  const dueDate =
    platformSettings?.paymentDueDays != null ? addDays(generatedAt, platformSettings.paymentDueDays) : null;

  const invoiceNumber = `${company.code}-${period.getUTCFullYear()}-${String(period.getUTCMonth() + 1).padStart(2, "0")}`;
  const pdf = await generatePortalInvoicePdf({
    invoice: { number: invoiceNumber, period },
    company: {
      name: company.name,
      code: company.code,
      contactName: company.contactName,
      contactEmail: company.contactEmail,
      address: company.address,
    },
    portalFeeAmount,
    hostingCostAmount,
    totalAmount,
    bankAccounts,
    dueDate,
  });
  const fileName = `portal-invoice-${invoiceNumber}.pdf`;

  const invoice = await prisma.portalInvoice.upsert({
    where: { companyId_period: { companyId: id, period } },
    create: {
      companyId: id,
      period,
      portalFeeAmount,
      hostingCostAmount,
      totalAmount,
      invoicePdf: new Uint8Array(pdf),
      invoiceFileName: fileName,
      invoiceGeneratedAt: generatedAt,
      invoiceDueDate: dueDate,
    },
    update: {
      portalFeeAmount,
      hostingCostAmount,
      totalAmount,
      invoicePdf: new Uint8Array(pdf),
      invoiceFileName: fileName,
      invoiceGeneratedAt: generatedAt,
      invoiceDueDate: dueDate,
      invoicePaidAt: null,
    },
    select: {
      id: true,
      period: true,
      portalFeeAmount: true,
      hostingCostAmount: true,
      totalAmount: true,
      invoiceGeneratedAt: true,
      invoiceDueDate: true,
      invoicePaidAt: true,
      company: { select: { id: true, name: true, code: true } },
    },
  });

  await recordAudit({
    entityType: "PORTAL_INVOICE",
    entityId: invoice.id,
    action: existing ? "UPDATE" : "CREATE",
    performedById: session.user.id,
    before: existing ? { totalAmount: existing.totalAmount } : null,
    after: { totalAmount, portalFeeAmount, hostingCostAmount, period },
  });

  return NextResponse.json({ invoice });
}
