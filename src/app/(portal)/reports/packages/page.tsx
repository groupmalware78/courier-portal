import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canViewReports } from "@/lib/rbac";
import { ReportTabs } from "@/components/ReportTabs";
import { STATUS_LABELS, type PackageStatus } from "@/components/StatusBadge";
import { ChartCard } from "@/components/ChartCard";
import { buildAllPeriods, timeSeriesLookbackStart } from "@/lib/timeSeries";

const ALL_STATUSES = Object.keys(STATUS_LABELS) as PackageStatus[];

export default async function PackagesReportPage() {
  const session = await auth();
  if (!session?.user || !canViewReports(session.user.role)) {
    redirect("/login");
  }

  const { total, today, last7Days, last30Days, byStatus, recentCreatedAt } = await apiClient.packages.stats({
    since: timeSeriesLookbackStart().toISOString(),
  });

  const statusCounts = new Map(Object.entries(byStatus));
  const volumeSeries = buildAllPeriods(recentCreatedAt.map((d) => ({ date: new Date(d), value: 1 })));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
        <ReportTabs />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Total packages" value={total} />
        <SummaryCard label="Logged today" value={today} />
        <SummaryCard label="Last 7 days" value={last7Days} />
        <SummaryCard label="Last 30 days" value={last30Days} />
      </div>

      <ChartCard title="Package volume" series={volumeSeries} />

      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50">
        <h2 className="text-sm font-semibold text-slate-900">By status</h2>
        <table className="mt-3 min-w-full divide-y divide-slate-100 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="py-2">Status</th>
              <th className="py-2 text-right">Packages</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ALL_STATUSES.map((status) => (
              <tr key={status}>
                <td className="py-2 text-slate-900">{STATUS_LABELS[status]}</td>
                <td className="py-2 text-right text-slate-600">{statusCounts.get(status) ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
