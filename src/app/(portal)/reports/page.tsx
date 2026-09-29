import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canViewReports } from "@/lib/rbac";

const CARDS = [
  {
    href: "/reports/financial",
    title: "Financial",
    description: "Revenue collected, outstanding balances, and payment status breakdown.",
  },
  {
    href: "/reports/customers",
    title: "Customers",
    description: "Customer count and the top customers by shipment volume.",
  },
  {
    href: "/reports/packages",
    title: "Packages",
    description: "Package volume by status, plus recent activity.",
  },
];

export default async function ReportsIndexPage() {
  const session = await auth();
  if (!session?.user || !canViewReports(session.user.role)) {
    redirect("/login");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">Pick a report to view.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50 transition hover:border-teal-300 hover:shadow-lg"
          >
            <h2 className="text-sm font-semibold text-slate-900">{card.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
