import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isApiError } from "@/lib/apiErrors";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canViewCustomers } from "@/lib/rbac";
import { formatDateTime } from "@/lib/formatDateTime";
import { StatusBadge, PaymentStatusBadge } from "@/components/StatusBadge";
import { formatPhoneDisplay } from "@/lib/phoneFormat";
import { Pager } from "@/components/Pager";

const PACKAGE_TYPE_LABELS = {
  BOX: "Box",
  BAG: "Bag",
  ENVELOPE: "Envelope",
  OTHER: "Other",
};

const PAGE_SIZE = 20;

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !canViewCustomers(session.user.role)) {
    redirect("/login");
  }

  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(Number(pageParam) || 1, 1);

  let customer;
  try {
    ({ customer } = await apiClient.customers.get(id));
  } catch (err) {
    if (isApiError(err) && err.status === 404) notFound();
    throw err;
  }

  const [{ user: portalUser }, { packages, total: totalPackages, totalPages }] = await Promise.all([
    apiClient.portalUsers.byEmail(customer.email),
    apiClient.packages.list({ customerId: customer.id, page, pageSize: PAGE_SIZE }),
  ]);

  return (
    <div className="space-y-4">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Customers
      </Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{customer.name}</h1>
                {customer.customerCode && (
                  <p className="mt-0.5 font-mono text-xs text-slate-500">{customer.customerCode}</p>
                )}
              </div>
              {portalUser && (
                <span
                  className={
                    portalUser.emailVerified
                      ? "inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                      : "inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800"
                  }
                >
                  {portalUser.emailVerified ? "Verified" : "Not verified"}
                </span>
              )}
            </div>

            <dl className="mt-4 divide-y divide-slate-100 text-sm">
              <Row label="Email" value={customer.email} />
              <Row label="Phone" value={customer.phone ? formatPhoneDisplay(customer.phone) : "—"} />
              {portalUser?.workPhone && <Row label="Work phone" value={formatPhoneDisplay(portalUser.workPhone)} />}
              <Row label="TRN" value={customer.trn ?? "—"} />
              <Row label="Customer since" value={formatDateTime(customer.createdAt)} />
              {portalUser?.storeLocation && <Row label="Pickup location" value={portalUser.storeLocation} />}
            </dl>
          </div>

          {portalUser?.addressLine1 && (
            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50">
              <h2 className="text-sm font-semibold text-slate-900">Address</h2>
              <address className="mt-2 not-italic text-sm text-slate-700">
                <p>{portalUser.addressLine1}</p>
                {portalUser.addressLine2 && <p>{portalUser.addressLine2}</p>}
                <p>{[portalUser.cityParish, portalUser.country].filter(Boolean).join(", ")}</p>
              </address>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-sm font-semibold text-slate-900">Packages</h2>
            <p className="text-xs text-slate-500">{totalPackages} total</p>
          </div>

          {packages.length === 0 ? (
            <p className="p-5 text-sm text-slate-400">No packages yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Tracking
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Type
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Payment
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Received
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {packages.map((pkg) => (
                    <tr key={pkg.id}>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-sm text-slate-900">
                        {pkg.trackingNumber}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-sm text-slate-600">
                        {PACKAGE_TYPE_LABELS[pkg.packageType]}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <StatusBadge status={pkg.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <PaymentStatusBadge status={pkg.paymentStatus} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-sm text-slate-600">
                        {pkg.receivedAt ? formatDateTime(pkg.receivedAt) : <span className="text-slate-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pager
                page={page}
                totalPages={totalPages}
                total={totalPackages}
                pageSize={PAGE_SIZE}
                searchParams={{}}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
