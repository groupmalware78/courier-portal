import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewReports } from "@/lib/rbac";
import { ReportTabs } from "@/components/ReportTabs";
import { ChartCard } from "@/components/ChartCard";
import { buildAllPeriods } from "@/lib/timeSeries";

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

// This platform's own revenue: what it bills EACH COMPANY for — portal
// lease + hosting cost (PortalInvoice) and per-manifest processing fees
// (Manifest). Deliberately excludes anything about a company's own
// customers (Package.cost/amountPaid/paymentStatus is the freight
// forwarder billing ITS OWN customer, a completely different balance this
// admin app has no business surfacing).
export default async function FinancialReportPage() {
  const session = await auth();
  if (!session?.user || !canViewReports(session.user.role)) {
    redirect("/dashboard");
  }

  const [allCompanies, portalInvoices, billedManifests] = await Promise.all([
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.portalInvoice.findMany({
      select: {
        companyId: true,
        portalFeeAmount: true,
        hostingCostAmount: true,
        totalAmount: true,
        invoiceGeneratedAt: true,
        invoicePaidAt: true,
      },
    }),
    prisma.manifest.findMany({
      where: { invoiceAmount: { not: null } },
      select: { companyId: true, invoiceAmount: true, invoiceGeneratedAt: true, invoicePaidAt: true },
    }),
  ]);

  let totalBilled = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;

  interface PlatformBillingRow {
    name: string;
    portalLeaseBilled: number;
    portalLeaseOutstanding: number;
    hostingBilled: number;
    hostingOutstanding: number;
    manifestBilled: number;
    manifestOutstanding: number;
  }
  const byPlatformBilling = new Map<string, PlatformBillingRow>(
    allCompanies.map((c) => [
      c.id,
      {
        name: c.name,
        portalLeaseBilled: 0,
        portalLeaseOutstanding: 0,
        hostingBilled: 0,
        hostingOutstanding: 0,
        manifestBilled: 0,
        manifestOutstanding: 0,
      },
    ])
  );

  for (const inv of portalInvoices) {
    totalBilled += inv.totalAmount;
    if (inv.invoicePaidAt) totalCollected += inv.totalAmount;
    else totalOutstanding += inv.totalAmount;

    const row = byPlatformBilling.get(inv.companyId);
    if (!row) continue;
    row.portalLeaseBilled += inv.portalFeeAmount;
    row.hostingBilled += inv.hostingCostAmount;
    if (!inv.invoicePaidAt) {
      row.portalLeaseOutstanding += inv.portalFeeAmount;
      row.hostingOutstanding += inv.hostingCostAmount;
    }
  }
  for (const m of billedManifests) {
    const amount = m.invoiceAmount ?? 0;
    totalBilled += amount;
    if (m.invoicePaidAt) totalCollected += amount;
    else totalOutstanding += amount;

    const row = byPlatformBilling.get(m.companyId);
    if (!row) continue;
    row.manifestBilled += amount;
    if (!m.invoicePaidAt) row.manifestOutstanding += amount;
  }

  // Revenue over time — by invoice generation date, not package/customer
  // activity.
  const revenueSeries = buildAllPeriods([
    ...portalInvoices
      .filter((inv) => inv.invoiceGeneratedAt)
      .map((inv) => ({ date: inv.invoiceGeneratedAt!, value: inv.totalAmount })),
    ...billedManifests
      .filter((m) => m.invoiceGeneratedAt)
      .map((m) => ({ date: m.invoiceGeneratedAt!, value: m.invoiceAmount ?? 0 })),
  ]);

  const platformBillingRows = [...byPlatformBilling.values()]
    .map((row) => ({
      ...row,
      totalBilled: row.portalLeaseBilled + row.hostingBilled + row.manifestBilled,
      totalOutstanding: row.portalLeaseOutstanding + row.hostingOutstanding + row.manifestOutstanding,
    }))
    .filter((row) => row.totalBilled > 0)
    .sort((a, b) => b.totalBilled - a.totalBilled);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
        <ReportTabs />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Total revenue (portal fee + hosting + manifests)" value={money(totalBilled)} />
        <SummaryCard label="Collected" value={money(totalCollected)} />
        <SummaryCard label="Outstanding balance" value={money(totalOutstanding)} accent="text-amber-600" />
      </div>

      <ChartCard title="Revenue over time" series={revenueSeries} format="currency" />

      <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50">
        <h2 className="text-sm font-semibold text-slate-900">Platform billing by company</h2>
        <p className="text-xs text-slate-500">
          This platform&apos;s own revenue and balance for each company — portal lease, hosting cost,
          and manifested-package fees, presented separately (see Portal Fee and Manifests).
        </p>
        <table className="mt-3 min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th rowSpan={2} className="px-3 py-2 align-bottom">Company</th>
              <th colSpan={2} className="border-l border-slate-100 px-3 py-1 text-center">Portal lease</th>
              <th colSpan={2} className="border-l border-slate-100 px-3 py-1 text-center">Hosting</th>
              <th colSpan={2} className="border-l border-slate-100 px-3 py-1 text-center">Manifests</th>
              <th colSpan={2} className="border-l border-slate-100 px-3 py-1 text-center">Total</th>
            </tr>
            <tr className="text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="border-l border-slate-100 px-3 py-1.5">Billed</th>
              <th className="px-3 py-1.5">Balance</th>
              <th className="border-l border-slate-100 px-3 py-1.5">Billed</th>
              <th className="px-3 py-1.5">Balance</th>
              <th className="border-l border-slate-100 px-3 py-1.5">Billed</th>
              <th className="px-3 py-1.5">Balance</th>
              <th className="border-l border-slate-100 px-3 py-1.5">Billed</th>
              <th className="px-3 py-1.5">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {platformBillingRows.length === 0 && (
              <tr>
                <td colSpan={9} className="py-4 text-center text-slate-400">
                  No portal or manifest invoices generated yet.
                </td>
              </tr>
            )}
            {platformBillingRows.map((row) => (
              <tr key={row.name}>
                <td className="whitespace-nowrap px-3 py-2 text-slate-900">{row.name}</td>
                <td className="whitespace-nowrap border-l border-slate-100 px-3 py-2 text-right text-slate-600">{money(row.portalLeaseBilled)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-amber-600">{money(row.portalLeaseOutstanding)}</td>
                <td className="whitespace-nowrap border-l border-slate-100 px-3 py-2 text-right text-slate-600">{money(row.hostingBilled)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-amber-600">{money(row.hostingOutstanding)}</td>
                <td className="whitespace-nowrap border-l border-slate-100 px-3 py-2 text-right text-slate-600">{money(row.manifestBilled)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-amber-600">{money(row.manifestOutstanding)}</td>
                <td className="whitespace-nowrap border-l border-slate-100 px-3 py-2 text-right font-medium text-slate-900">{money(row.totalBilled)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-amber-600">{money(row.totalOutstanding)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}
