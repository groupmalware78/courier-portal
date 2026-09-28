import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManagePortalFee } from "@/lib/rbac";
import { normalizePeriod } from "@/lib/portalInvoicePeriod";

// Every company's PortalInvoice (if any) for one calendar month — used by
// /dashboard/portal-fees when switching the period selector, so the page
// doesn't have to re-fetch the whole companies list.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManagePortalFee(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const period = normalizePeriod(request.nextUrl.searchParams.get("period") ?? "");
  if (!period) {
    return NextResponse.json({ error: "A valid period (YYYY-MM) is required." }, { status: 400 });
  }

  const invoices = await prisma.portalInvoice.findMany({
    where: { period },
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

  return NextResponse.json({ invoices });
}
