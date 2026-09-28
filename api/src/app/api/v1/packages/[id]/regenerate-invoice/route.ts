import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";
import { packageInclude } from "@/lib/packageSchema";
import { generateInvoicePdf } from "@/lib/invoicePdf";

// On-demand version of the invoice generation that normally only happens
// automatically in lib/packageStatusNotify.ts when a package's status
// crosses into READY_FOR_PICKUP/DELIVERED. Staff need this when they
// correct cost/duties/fee *after* that invoice already went out — those
// edits don't trigger a status change, so the stored PDF would otherwise
// go stale. Unlike the status-change path, this never emails the
// customer — it's a quiet replace, not a new notification.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const { id } = await params;
  const pkg = await prisma.package.findUnique({ where: { id }, include: packageInclude });
  if (!pkg || pkg.companyId !== companyId) {
    return NextResponse.json({ error: "Package not found." }, { status: 404 });
  }
  if (!pkg.customer) {
    return NextResponse.json(
      { error: "Package must have a customer assigned to generate an invoice." },
      { status: 400 }
    );
  }

  const settings = await prisma.portalSettings.findUnique({ where: { id: companyId } });
  const companyName = settings?.companyName ?? "Your Freight Forwarder";

  const pdf = await generateInvoicePdf({
    package: {
      trackingNumber: pkg.trackingNumber,
      hawb: pkg.hawb,
      description: pkg.description,
      packageType: pkg.packageType,
      pieces: pkg.pieces,
      weightLbs: pkg.weightLbs,
      cost: pkg.cost,
      paymentStatus: pkg.paymentStatus,
      amountPaid: pkg.amountPaid,
      calculatedFee: pkg.calculatedFee,
      calculatedFeeBasis: pkg.calculatedFeeBasis,
      declaredValue: pkg.declaredValue,
      dutyImportDuty: pkg.dutyImportDuty,
      dutyStampDuty: pkg.dutyStampDuty,
      dutyAdditionalStampDuty: pkg.dutyAdditionalStampDuty,
      dutyGct: pkg.dutyGct,
      dutySct: pkg.dutySct,
      dutyStandardComplianceFee: pkg.dutyStandardComplianceFee,
      dutyEnvironmentalLevy: pkg.dutyEnvironmentalLevy,
      dutyCustomsAdminFee: pkg.dutyCustomsAdminFee,
    },
    customer: {
      name: pkg.customer.name,
      email: pkg.customer.email,
      customerCode: pkg.customer.customerCode,
    },
    settings: {
      companyName,
      contactEmail: settings?.contactEmail ?? null,
      contactPhone: settings?.contactPhone ?? null,
      bankName: settings?.bankName ?? null,
      bankAccountName: settings?.bankAccountName ?? null,
      bankAccountNumber: settings?.bankAccountNumber ?? null,
      bankRoutingNumber: settings?.bankRoutingNumber ?? null,
      bankBranch: settings?.bankBranch ?? null,
    },
  });

  const filename = `invoice-${pkg.trackingNumber}.pdf`;
  const updated = await prisma.package.update({
    where: { id },
    data: {
      generatedInvoicePdf: new Uint8Array(pdf),
      generatedInvoiceFileName: filename,
      generatedInvoiceAt: new Date(),
    },
    include: packageInclude,
  });

  return NextResponse.json({ package: updated });
}
