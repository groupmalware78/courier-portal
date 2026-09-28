import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManagePortalFee } from "@/lib/rbac";
import { PortalFeeView } from "@/components/PortalFeeView";
import { normalizePeriod, periodToInputValue } from "@/lib/portalInvoicePeriod";

export default async function PortalFeesPage() {
  const session = await auth();
  if (!session?.user || !canManagePortalFee(session.user.role)) {
    redirect("/dashboard");
  }

  const currentPeriod = normalizePeriod(periodToInputValue(new Date()))!;

  const [companies, invoices, platformSettings] = await Promise.all([
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, hostingCostMonthly: true },
    }),
    prisma.portalInvoice.findMany({
      where: { period: currentPeriod },
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
    }),
    prisma.platformSettings.findUnique({ where: { id: "platform" } }),
  ]);

  return (
    <PortalFeeView
      initialCompanies={JSON.parse(JSON.stringify(companies))}
      initialInvoices={JSON.parse(JSON.stringify(invoices))}
      initialPeriod={periodToInputValue(currentPeriod)}
      initialPortalFeeMonthly={platformSettings?.portalFeeMonthly ?? 0}
    />
  );
}
