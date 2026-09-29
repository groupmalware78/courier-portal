import Link from "next/link";
import { notFound } from "next/navigation";
import { isApiError } from "@/lib/apiErrors";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { StatusBadge, PaymentStatusBadge } from "@/components/StatusBadge";
import { StatusHistoryTimeline } from "@/components/StatusHistoryTimeline";
import { InvoiceUpload } from "@/components/InvoiceUpload";
import { DeliveryRequestCard } from "@/components/DeliveryRequestCard";
import { formatDateTime } from "@/lib/formatDateTime";
import { DUTY_FIELDS, dutyAmount } from "@/lib/rbac";

const PACKAGE_TYPE_LABELS = {
  BOX: "Box",
  BAG: "Bag",
  ENVELOPE: "Envelope",
  OTHER: "Other",
};

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const { customer } = await apiClient.customers.byEmail(session!.user.email ?? "");

  let pkg = null;
  if (customer) {
    try {
      const result = await apiClient.packages.get(id);
      if (result.package.customerId === customer.id) pkg = result.package;
    } catch (err) {
      if (!(isApiError(err) && err.status === 404)) throw err;
    }
  }

  if (!pkg) {
    notFound();
  }

  const [{ events }, { user: portalUser }, { deliveries }] = await Promise.all([
    apiClient.packages.statusEvents(pkg.id),
    apiClient.portalUsers.get(session!.user.id),
    apiClient.deliveryAssignments.list({ packageId: pkg.id }),
  ]);
  const latestDelivery = deliveries[0] ?? null;
  // Each duty field is a percentage of declaredValue, not a flat dollar
  // amount — see dutyAmount() in lib/rbac.ts.
  const totalDuties = DUTY_FIELDS.reduce(
    (sum, key) => sum + dutyAmount(pkg[key], pkg.declaredValue),
    0
  );
  // Mirrors invoicePdf.ts's own total/balance-due formula (both apps) —
  // keep in sync with that if either changes.
  const totalCost = (pkg.cost ?? 0) + (pkg.calculatedFee ?? 0) + totalDuties;
  const amountDue = Math.max(totalCost - (pkg.amountPaid ?? 0), 0);

  return (
    <div className="space-y-4">
      <Link
        href="/my-shipments"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        My Shipments
      </Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {pkg.description || "Shipment"}
                </h1>
                <p className="mt-1 break-all font-mono text-sm text-slate-500">
                  {pkg.trackingNumber}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <StatusBadge status={pkg.status} />
                <PaymentStatusBadge status={pkg.paymentStatus} />
              </div>
            </div>

            <div className="mt-4">
              <InvoiceUpload
                packageId={pkg.id}
                hasInvoice={!!pkg.invoiceFileName}
                invoiceFileName={pkg.invoiceFileName}
                invoiceUploadedAt={pkg.invoiceUploadedAt}
              />
            </div>

            {pkg.generatedInvoiceFileName && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">Your invoice</p>
                  <p className="text-xs text-slate-500">
                    Generated {pkg.generatedInvoiceAt ? formatDateTime(pkg.generatedInvoiceAt) : ""}
                  </p>
                </div>
                <a
                  href={`/api/packages/${pkg.id}/invoice`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-3 py-1.5 text-xs font-medium text-white transition hover:from-teal-500 hover:to-cyan-500"
                >
                  Download
                </a>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50">
            <h2 className="text-sm font-semibold text-slate-900">Package Information</h2>
            <dl className="mt-3 divide-y divide-slate-100">
              <Row label="HAWB Number" value={pkg.hawb} />
              {pkg.cost != null && <Row label="Shipping Cost" value={`$${pkg.cost.toFixed(2)}`} />}
              {pkg.calculatedFee != null && <Row label="Fee" value={`$${pkg.calculatedFee.toFixed(2)}`} />}
              {totalDuties > 0 && <Row label="Customs Duties" value={`$${totalDuties.toFixed(2)}`} />}
              {pkg.amountPaid != null && pkg.amountPaid > 0 && (
                <Row label="Amount Paid" value={`$${pkg.amountPaid.toFixed(2)}`} />
              )}
              {amountDue > 0 && (
                <Row
                  label="Total Amount to Pay"
                  value={`$${amountDue.toFixed(2)}`}
                  emphasize
                />
              )}
              <Row label="Type" value={PACKAGE_TYPE_LABELS[pkg.packageType]} />
              <Row label="Pieces" value={pkg.pieces} />
              {pkg.weightLbs != null && <Row label="Weight" value={`${pkg.weightLbs} lbs`} />}
              {pkg.merchantName && <Row label="Merchant / Seller" value={pkg.merchantName} />}
              {pkg.receivedAt ? (
                <Row label="Received" value={formatDateTime(pkg.receivedAt)} />
              ) : (
                <Row label="Received" value="Not yet received" />
              )}
              <Row label="Last updated" value={formatDateTime(pkg.updatedAt)} />
            </dl>
            {pkg.additionalDetails && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Additional details
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {pkg.additionalDetails}
                </p>
              </div>
            )}
          </div>

          {pkg.status !== "DELIVERED" && (
            <DeliveryRequestCard
              packageId={pkg.id}
              initialDelivery={
                latestDelivery
                  ? {
                      id: latestDelivery.id,
                      status: latestDelivery.status,
                      assignedAt: latestDelivery.assignedAt,
                      addressLine1: latestDelivery.addressLine1,
                      addressLine2: latestDelivery.addressLine2,
                      cityParish: latestDelivery.cityParish,
                      country: latestDelivery.country,
                      driver: latestDelivery.driver ? { name: latestDelivery.driver.name } : null,
                    }
                  : null
              }
              defaultAddress={{
                addressLine1: portalUser?.addressLine1 ?? "",
                addressLine2: portalUser?.addressLine2 ?? "",
                cityParish: portalUser?.cityParish ?? "",
                country: portalUser?.country ?? "",
              }}
            />
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50">
          <h2 className="text-sm font-semibold text-slate-900">Tracking Information</h2>
          <p className="mt-1 text-xs text-slate-400">
            Follow your shipment&apos;s status from start to delivery.
          </p>
          <div className="mt-4">
            <StatusHistoryTimeline
              events={events.map((e) => ({
                id: e.id,
                toStatus: e.toStatus,
                changedAt: e.changedAt,
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string | number;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 text-sm">
      <dt className={emphasize ? "font-medium text-slate-900" : "text-slate-500"}>{label}</dt>
      <dd className={emphasize ? "text-base font-semibold text-teal-700" : "font-medium text-slate-900"}>
        {value}
      </dd>
    </div>
  );
}
