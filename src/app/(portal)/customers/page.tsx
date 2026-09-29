import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canViewCustomers } from "@/lib/rbac";
import { CustomerSearchInput } from "@/components/CustomerSearchInput";
import { formatPhoneDisplay } from "@/lib/phoneFormat";
import { Pager } from "@/components/Pager";

const PAGE_SIZE = 20;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !canViewCustomers(session.user.role)) {
    redirect("/login");
  }

  const { q, page: pageParam } = await searchParams;
  const page = Math.max(Number(pageParam) || 1, 1);

  // customers.list()'s search already covers name/email/customerCode/trn/
  // phone server-side (see admin's internal/customers/route.ts).
  const { customers, total, totalPages } = await apiClient.customers.list({
    ...(q?.trim() ? { q: q.trim() } : {}),
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customers</h1>
        <p className="text-sm text-slate-500">Every customer registered to this account.</p>
      </div>

      <CustomerSearchInput initialValue={q ?? ""} />

      {customers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">
            {q?.trim() ? `No customers match "${q.trim()}".` : "No customers registered to this account yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Customer ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Packages
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((customer) => (
                <tr key={customer.id} className="cursor-pointer hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">
                    <Link href={`/customers/${customer.id}`} className="block">
                      {customer.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    <Link href={`/customers/${customer.id}`} className="block font-mono">
                      {customer.customerCode ?? <span className="text-slate-400">—</span>}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    <Link href={`/customers/${customer.id}`} className="block">
                      {customer.email}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    <Link href={`/customers/${customer.id}`} className="block">
                      {customer.phone ? formatPhoneDisplay(customer.phone) : <span className="text-slate-400">—</span>}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    <Link href={`/customers/${customer.id}`} className="block">
                      {customer._count?.packages ?? 0}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            searchParams={{ q }}
          />
        </div>
      )}
    </div>
  );
}
