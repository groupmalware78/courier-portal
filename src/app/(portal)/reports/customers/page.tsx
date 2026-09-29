import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canViewReports } from "@/lib/rbac";
import { ReportTabs } from "@/components/ReportTabs";
import { ChartCard } from "@/components/ChartCard";
import { buildAllPeriods, timeSeriesLookbackStart } from "@/lib/timeSeries";

export default async function CustomersReportPage() {
  const session = await auth();
  if (!session?.user || !canViewReports(session.user.role)) {
    redirect("/login");
  }

  const { total: totalCustomers, topCustomers, recentCreatedAt } = await apiClient.customers.stats({
    since: timeSeriesLookbackStart().toISOString(),
  });

  const signupSeries = buildAllPeriods(recentCreatedAt.map((d) => ({ date: new Date(d), value: 1 })));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
        <ReportTabs />
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50 sm:w-64">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total customers</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{totalCustomers}</p>
      </div>

      <ChartCard title="New customers" series={signupSeries} color="#6366f1" />

      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50">
        <h2 className="text-sm font-semibold text-slate-900">Top customers by shipment volume</h2>
        <table className="mt-3 min-w-full divide-y divide-slate-100 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="py-2">Customer</th>
              <th className="py-2 text-right">Packages</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {topCustomers.length === 0 && (
              <tr>
                <td colSpan={2} className="py-4 text-center text-slate-400">
                  No customers yet.
                </td>
              </tr>
            )}
            {topCustomers.map((c) => (
              <tr key={c.id}>
                <td className="py-2">
                  <p className="text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.email}</p>
                </td>
                <td className="py-2 text-right text-slate-600">{c.packageCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
