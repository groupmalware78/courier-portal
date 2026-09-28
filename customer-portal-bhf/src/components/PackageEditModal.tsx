"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { PackageStatus, PackageType, PaymentStatus, PortalRole } from "@/lib/apiTypes";
import {
  DUTY_FIELDS,
  DUTY_FIELD_LABELS,
  DUTY_MIN_DECLARED_VALUE,
  canUseFeeCalculator,
  canRegenerateInvoice,
  allowedStatusValues,
  dutyAmount,
  type EditablePackageField,
} from "@/lib/rbac";

const PACKAGE_STATUSES: PackageStatus[] = [
  "PENDING",
  "RECEIVED",
  "SHIPPED",
  "AT_CUSTOMS",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DAMAGED",
  "EMPTY_PACKAGE",
  "RETURNED",
];
const STATUS_LABELS: Record<PackageStatus, string> = {
  PENDING: "Pending (pre-alert)",
  RECEIVED: "Received at warehouse",
  SHIPPED: "Shipped",
  AT_CUSTOMS: "At customs",
  READY_FOR_PICKUP: "Ready for pickup",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  DAMAGED: "Damaged",
  EMPTY_PACKAGE: "Empty package",
  RETURNED: "Returned",
};

const PAYMENT_STATUSES: PaymentStatus[] = ["UNPAID", "PARTIAL", "PAID"];
const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  PARTIAL: "Partially paid",
  PAID: "Paid",
};

const PACKAGE_TYPES: PackageType[] = ["BOX", "BAG", "ENVELOPE", "OTHER"];
const PACKAGE_TYPE_LABELS: Record<PackageType, string> = {
  BOX: "Box",
  BAG: "Bag",
  ENVELOPE: "Envelope",
  OTHER: "Other",
};

interface ShippingRateOption {
  id: string;
  label: string;
  minWeightLbs: number;
  maxWeightLbs: number | null;
  price: number;
}

interface CustomerOption {
  id: string;
  name: string;
  email: string;
}

export interface EditablePackageRow {
  id: string;
  trackingNumber: string;
  status: PackageStatus;
  packageType: PackageType;
  pieces: number;
  weightLbs: number | null;
  rate: number | null;
  cost: number | null;
  paymentStatus: PaymentStatus;
  amountPaid: number | null;
  description: string | null;
  declaredValue: number | null;
  dutyImportDuty: number | null;
  dutyStampDuty: number | null;
  dutyAdditionalStampDuty: number | null;
  dutyGct: number | null;
  dutySct: number | null;
  dutyStandardComplianceFee: number | null;
  dutyEnvironmentalLevy: number | null;
  dutyCustomsAdminFee: number | null;
  calculatedFee: number | null;
  calculatedFeeBasis: "WEIGHT" | "VALUE" | null;
  customerId: string | null;
  customer: { name: string; email: string } | null;
  generatedInvoiceFileName: string | null;
}

export function PackageEditModal({
  pkg,
  editableFields,
  onClose,
  onUpdated,
  showCalculateDuties,
  role,
}: {
  pkg: EditablePackageRow;
  editableFields: EditablePackageField[];
  onClose: () => void;
  onUpdated: (pkg: EditablePackageRow) => void;
  showCalculateDuties?: boolean;
  role: PortalRole;
}) {
  const canEdit = (field: EditablePackageField) => editableFields.includes(field);

  const [status, setStatus] = useState<PackageStatus>(pkg.status);
  const [packageType, setPackageType] = useState<PackageType>(pkg.packageType);
  const [weight, setWeight] = useState(pkg.weightLbs != null ? String(pkg.weightLbs) : "");
  const [pieces, setPieces] = useState(String(pkg.pieces));
  const [rate, setRate] = useState(pkg.rate != null ? String(pkg.rate) : "");
  const [cost, setCost] = useState(pkg.cost != null ? String(pkg.cost) : "");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(pkg.paymentStatus);
  const [amountPaid, setAmountPaid] = useState(pkg.amountPaid != null ? String(pkg.amountPaid) : "");
  const [description, setDescription] = useState(pkg.description ?? "");
  const [declaredValue, setDeclaredValue] = useState(pkg.declaredValue != null ? String(pkg.declaredValue) : "");
  const [customerId, setCustomerId] = useState<string>(pkg.customerId ?? "");
  const [duties, setDuties] = useState<Record<(typeof DUTY_FIELDS)[number], string>>(() => {
    const init = {} as Record<(typeof DUTY_FIELDS)[number], string>;
    for (const key of DUTY_FIELDS) {
      const value = pkg[key];
      init[key] = value != null ? String(value) : "";
    }
    return init;
  });
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [shippingRates, setShippingRates] = useState<ShippingRateOption[]>([]);
  const [rateLookupMessage, setRateLookupMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedInvoiceFileName, setGeneratedInvoiceFileName] = useState(pkg.generatedInvoiceFileName);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [regenerateSuccess, setRegenerateSuccess] = useState(false);

  const readOnly = editableFields.length === 0;
  const canEditDuties = DUTY_FIELDS.some((key) => canEdit(key));
  // CSR can only move a package to OUT_FOR_DELIVERY/DELIVERED — see
  // allowedStatusValues() in lib/rbac.ts. When the package's current
  // status isn't one of those (e.g. still AT_CUSTOMS), show it as a
  // disabled leading option so the select has something to display
  // instead of appearing blank, without letting it actually be re-picked.
  const statusRestriction = allowedStatusValues(role);
  const statusOptions = statusRestriction ? statusRestriction : PACKAGE_STATUSES;
  const currentStatusInOptions = statusOptions.includes(pkg.status);
  const declaredValueNum = declaredValue.trim() ? Number(declaredValue) : null;
  const dutiesEligible = declaredValueNum != null && declaredValueNum >= DUTY_MIN_DECLARED_VALUE;
  // Each duty field is a percentage of declaredValue, not a flat dollar
  // amount — see dutyAmount() in lib/rbac.ts.
  const totalDuties = DUTY_FIELDS.reduce(
    (sum, key) =>
      sum + dutyAmount(duties[key].trim() ? Number(duties[key]) : null, declaredValueNum),
    0
  );

  // "Total Amount to Pay" — CSR (disabled/read-only, they only ever touch
  // paymentStatus), Admin, and Logger; not Driver, who never sees billing.
  // Mirrors invoicePdf.ts's own total/balance-due formula (both apps) —
  // keep in sync with that if either changes. Uses the live draft value
  // for any field the current role can actually edit (so Admin/Logger see
  // the total update as they type), falling back to the saved package
  // value for fields they can't touch.
  const showAmountDue = role === "ADMIN" || role === "CSR" || role === "LOGGER";
  const amountDueDisabled = role === "CSR";
  const costForTotal = canEdit("cost") ? (cost.trim() ? Number(cost) : 0) : pkg.cost ?? 0;
  const amountPaidForTotal = canEdit("amountPaid")
    ? amountPaid.trim()
      ? Number(amountPaid)
      : 0
    : pkg.amountPaid ?? 0;
  const amountDue = Math.max(
    costForTotal + (pkg.calculatedFee ?? 0) + totalDuties - amountPaidForTotal,
    0
  );

  useEffect(() => {
    if (canEdit("customerId")) {
      fetch("/api/customers")
        .then((res) => (res.ok ? res.json() : { customers: [] }))
        .then((data) => setCustomers(data.customers ?? []))
        .catch(() => setCustomers([]));
    }
    if (canEdit("rate") || canEdit("cost")) {
      fetch("/api/shipping-rates")
        .then((res) => (res.ok ? res.json() : { rates: [] }))
        .then((data) => setShippingRates(data.rates ?? []))
        .catch(() => setShippingRates([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRateChange(value: string) {
    setRate(value);
    setRateLookupMessage(null);
    const w = Number(weight);
    const r = Number(value);
    if (weight.trim() && !Number.isNaN(w) && value.trim() && !Number.isNaN(r)) {
      setCost((w * r).toFixed(2));
    }
  }

  function handleLookupRate() {
    setRateLookupMessage(null);
    const w = Number(weight);
    if (!weight.trim() || Number.isNaN(w) || w <= 0) {
      setRateLookupMessage("Enter a weight first.");
      return;
    }
    const matched = shippingRates.find(
      (r) => w >= r.minWeightLbs && (r.maxWeightLbs == null || w <= r.maxWeightLbs)
    );
    if (!matched) {
      setRateLookupMessage("No shipping rate matches this weight.");
      return;
    }
    setCost(matched.price.toFixed(2));
    setRate((matched.price / w).toFixed(2));
    setRateLookupMessage(`Matched "${matched.label}" — $${matched.price.toFixed(2)}.`);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: Record<string, unknown> = {};
    // Only include status if it actually changed — otherwise a CSR saving
    // an unrelated field (e.g. paymentStatus) while the package sits at a
    // status they're not allowed to *set* (say, AT_CUSTOMS) would
    // needlessly resend that same value and get 403'd by the
    // allowedStatusValues() check server-side.
    if (canEdit("status") && status !== pkg.status) payload.status = status;
    if (canEdit("packageType")) payload.packageType = packageType;
    if (canEdit("weightLbs")) payload.weightLbs = weight.trim() ? Number(weight) : null;
    if (canEdit("pieces")) payload.pieces = pieces.trim() ? Number(pieces) : undefined;
    if (canEdit("rate")) payload.rate = rate.trim() ? Number(rate) : null;
    if (canEdit("cost")) payload.cost = cost.trim() ? Number(cost) : null;
    if (canEdit("paymentStatus")) payload.paymentStatus = paymentStatus;
    if (canEdit("amountPaid")) payload.amountPaid = amountPaid.trim() ? Number(amountPaid) : null;
    if (canEdit("description")) payload.description = description.trim() || null;
    if (canEdit("declaredValue")) payload.declaredValue = declaredValue.trim() ? Number(declaredValue) : null;
    if (canEdit("customerId")) payload.customerId = customerId || null;
    if (canEditDuties && dutiesEligible) {
      for (const key of DUTY_FIELDS) {
        payload[key] = duties[key].trim() ? Number(duties[key]) : null;
      }
    }

    const res = await fetch(`/api/packages/${pkg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to save changes.");
      return;
    }

    onUpdated(data.package as EditablePackageRow);
    onClose();
  }

  // Kept as its own action, separate from the main form's save-and-close,
  // since staff regenerate an invoice to check/download the fresh PDF
  // right away rather than leave the modal.
  async function handleRegenerateInvoice() {
    setRegenerating(true);
    setRegenerateError(null);
    setRegenerateSuccess(false);

    const res = await fetch(`/api/packages/${pkg.id}/regenerate-invoice`, { method: "POST" });
    const data = await res.json();
    setRegenerating(false);

    if (!res.ok) {
      setRegenerateError(data.error ?? "Failed to regenerate invoice.");
      return;
    }

    setGeneratedInvoiceFileName(data.package.generatedInvoiceFileName);
    setRegenerateSuccess(true);
    onUpdated(data.package as EditablePackageRow);
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600";
  const readOnlyBoxClass =
    "rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="package-edit-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="package-edit-title" className="font-mono text-base font-semibold text-slate-900">
            {pkg.trackingNumber}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {showCalculateDuties && (
          <div className="border-b border-slate-200 px-5 py-3">
            <a
              href="https://jca.gov.jm/e-services/whats-my-duty/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-md border border-emerald-200 bg-emerald-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-emerald-200"
            >
              Calculate Customs Duties
            </a>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label htmlFor="edit-customer" className="mb-1 block text-sm font-medium text-slate-700">
              Customer
            </label>
            {canEdit("customerId") ? (
              <select
                id="edit-customer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className={inputClass}
              >
                <option value="">— No customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            ) : (
              <div className={readOnlyBoxClass}>
                {pkg.customer ? `${pkg.customer.name} (${pkg.customer.email})` : "—"}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-status" className="mb-1 block text-sm font-medium text-slate-700">
                Status
              </label>
              {canEdit("status") ? (
                <select
                  id="edit-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PackageStatus)}
                  className={inputClass}
                >
                  {!currentStatusInOptions && (
                    <option value={pkg.status} disabled>
                      {STATUS_LABELS[pkg.status]} (current)
                    </option>
                  )}
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s as PackageStatus]}
                    </option>
                  ))}
                </select>
              ) : (
                <div className={readOnlyBoxClass}>{STATUS_LABELS[pkg.status]}</div>
              )}
            </div>
            <div>
              <label htmlFor="edit-package-type" className="mb-1 block text-sm font-medium text-slate-700">
                Package type
              </label>
              {canEdit("packageType") ? (
                <select
                  id="edit-package-type"
                  value={packageType}
                  onChange={(e) => setPackageType(e.target.value as PackageType)}
                  className={inputClass}
                >
                  {PACKAGE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {PACKAGE_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              ) : (
                <div className={readOnlyBoxClass}>{PACKAGE_TYPE_LABELS[pkg.packageType]}</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-pieces" className="mb-1 block text-sm font-medium text-slate-700">
                No. of pieces
              </label>
              {canEdit("pieces") ? (
                <input
                  id="edit-pieces"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={pieces}
                  onChange={(e) => setPieces(e.target.value)}
                  className={inputClass}
                />
              ) : (
                <div className={readOnlyBoxClass}>{pkg.pieces}</div>
              )}
            </div>
            <div>
              <label htmlFor="edit-weight" className="mb-1 block text-sm font-medium text-slate-700">
                Weight (lbs)
              </label>
              {canEdit("weightLbs") ? (
                <input
                  id="edit-weight"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className={inputClass}
                />
              ) : (
                <div className={readOnlyBoxClass}>
                  {pkg.weightLbs != null ? `${pkg.weightLbs} lbs` : "—"}
                </div>
              )}
            </div>
          </div>

          {(canEdit("rate") || canEdit("cost")) && (
            <div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-rate" className="mb-1 block text-sm font-medium text-slate-700">
                    Rate ($/lb)
                  </label>
                  {canEdit("rate") ? (
                    <input
                      id="edit-rate"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={rate}
                      onChange={(e) => handleRateChange(e.target.value)}
                      className={inputClass}
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>{pkg.rate != null ? `$${pkg.rate}` : "—"}</div>
                  )}
                </div>
                <div>
                  <label htmlFor="edit-cost" className="mb-1 block text-sm font-medium text-slate-700">
                    Cost ($)
                  </label>
                  {canEdit("cost") ? (
                    <input
                      id="edit-cost"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      className={inputClass}
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>{pkg.cost != null ? `$${pkg.cost}` : "—"}</div>
                  )}
                </div>
              </div>
              {(canEdit("rate") || canEdit("cost")) && shippingRates.length > 0 && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={handleLookupRate}
                    className="text-xs font-medium text-teal-700 hover:underline"
                  >
                    Look up rate from shipping rates
                  </button>
                  {rateLookupMessage && (
                    <p className="mt-1 text-xs text-slate-500">{rateLookupMessage}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {(canEdit("paymentStatus") || canEdit("amountPaid")) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-payment-status" className="mb-1 block text-sm font-medium text-slate-700">
                  Payment status
                </label>
                {canEdit("paymentStatus") ? (
                  <select
                    id="edit-payment-status"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    className={inputClass}
                  >
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {PAYMENT_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className={readOnlyBoxClass}>{PAYMENT_STATUS_LABELS[pkg.paymentStatus]}</div>
                )}
              </div>
              <div>
                <label htmlFor="edit-amount-paid" className="mb-1 block text-sm font-medium text-slate-700">
                  Amount paid ($)
                </label>
                {canEdit("amountPaid") ? (
                  <input
                    id="edit-amount-paid"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className={inputClass}
                  />
                ) : (
                  <div className={readOnlyBoxClass}>{pkg.amountPaid != null ? `$${pkg.amountPaid}` : "—"}</div>
                )}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="edit-description" className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </label>
            {canEdit("description") ? (
              <input
                id="edit-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
            ) : (
              <div className={readOnlyBoxClass}>{pkg.description || "—"}</div>
            )}
          </div>

          <div>
            <label htmlFor="edit-declared-value" className="mb-1 block text-sm font-medium text-slate-700">
              Declared value ($)
            </label>
            {canEdit("declaredValue") ? (
              <input
                id="edit-declared-value"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={declaredValue}
                onChange={(e) => setDeclaredValue(e.target.value)}
                className={inputClass}
              />
            ) : (
              <div className={readOnlyBoxClass}>{pkg.declaredValue != null ? `$${pkg.declaredValue}` : "—"}</div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-4 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Jamaica Customs Duties
            </p>
            {canEditDuties ? (
              dutiesEligible ? (
                <>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {DUTY_FIELDS.map((key) => {
                      const fieldAmount = dutyAmount(
                        duties[key].trim() ? Number(duties[key]) : null,
                        declaredValueNum
                      );
                      return (
                        <div key={key}>
                          <label htmlFor={`edit-${key}`} className="mb-1 block text-xs text-slate-500">
                            {DUTY_FIELD_LABELS[key]} (%)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              id={`edit-${key}`}
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              value={duties[key]}
                              onChange={(e) =>
                                setDuties((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                              className={inputClass}
                            />
                            <span className="w-16 shrink-0 text-right text-xs text-slate-500">
                              {duties[key].trim() ? `$${fieldAmount.toFixed(2)}` : "—"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {totalDuties > 0 && (
                    <p className="mt-2 text-slate-700">
                      Total duties: <span className="font-semibold">${totalDuties.toFixed(2)}</span>{" "}
                      <span className="text-xs text-slate-400">
                        (of ${declaredValueNum?.toFixed(2)} declared value)
                      </span>
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-1 text-slate-400">
                  Enter a declared value of ${DUTY_MIN_DECLARED_VALUE} or more to add duties.
                </p>
              )
            ) : totalDuties > 0 ? (
              <div className="mt-1 space-y-1 text-slate-700">
                {DUTY_FIELDS.filter((key) => pkg[key] != null).map((key) => (
                  <div key={key} className="flex justify-between gap-2">
                    <span className="text-slate-500">
                      {DUTY_FIELD_LABELS[key]} ({pkg[key]}%)
                    </span>
                    <span>${dutyAmount(pkg[key], pkg.declaredValue).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between gap-2 border-t border-slate-100 pt-1 font-semibold text-slate-900">
                  <span>Total duties</span>
                  <span>${totalDuties.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-slate-400">None entered.</p>
            )}
          </div>

          <div className="border-t border-slate-200 pt-4 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Fee</p>
            {pkg.calculatedFee != null ? (
              <p className="mt-1 text-slate-700">
                <span className="font-semibold">${pkg.calculatedFee.toFixed(2)}</span>{" "}
                <span className="text-xs text-slate-400">
                  ({pkg.calculatedFeeBasis === "VALUE" ? "value-based" : "weight-based"})
                </span>
              </p>
            ) : canUseFeeCalculator(role) ? (
              <p className="mt-1 text-slate-400">
                Not generated yet — use the{" "}
                <a href="/fee-calculator" className="text-teal-700 hover:underline">
                  Fee Calculator
                </a>
                .
              </p>
            ) : (
              <p className="mt-1 text-slate-400">Not generated yet.</p>
            )}
          </div>

          {showAmountDue && (
            <div className="border-t border-slate-200 pt-4 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Total Amount to Pay
              </p>
              {amountDueDisabled ? (
                <div className={`mt-1 ${readOnlyBoxClass}`}>${amountDue.toFixed(2)}</div>
              ) : (
                <p className="mt-1 text-base font-semibold text-teal-700">
                  ${amountDue.toFixed(2)}
                </p>
              )}
            </div>
          )}

          <div className="border-t border-slate-200 pt-4 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Generated invoice
            </p>
            <div className="mt-1 flex items-center justify-between gap-3">
              {generatedInvoiceFileName ? (
                <a
                  href={`/api/packages/${pkg.id}/invoice`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 hover:underline"
                >
                  {generatedInvoiceFileName}
                </a>
              ) : (
                <p className="text-slate-400">Not generated yet.</p>
              )}
              {canRegenerateInvoice(role) && (
                <button
                  type="button"
                  onClick={handleRegenerateInvoice}
                  disabled={regenerating}
                  className="shrink-0 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {regenerating ? "Generating…" : generatedInvoiceFileName ? "Regenerate" : "Generate"}
                </button>
              )}
            </div>
            {regenerateError && (
              <p className="mt-1 text-xs text-red-600">{regenerateError}</p>
            )}
            {regenerateSuccess && !regenerateError && (
              <p className="mt-1 text-xs text-emerald-600">Invoice regenerated.</p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
            >
              {readOnly ? "Close" : "Cancel"}
            </button>
            {!readOnly && (
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Save changes"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
