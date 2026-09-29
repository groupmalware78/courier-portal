"use client";

import { useState, type FormEvent } from "react";
import { formatDateTime } from "@/lib/formatDateTime";

type DeliveryStatus = "REQUESTED" | "ASSIGNED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "FAILED";

interface Delivery {
  id: string;
  status: DeliveryStatus;
  assignedAt: string;
  addressLine1: string;
  addressLine2: string | null;
  cityParish: string;
  country: string;
  driver: { name: string } | null;
}

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  REQUESTED: "Requested — waiting to be assigned a driver",
  ASSIGNED: "Assigned to a driver",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  FAILED: "Delivery attempt failed",
};

const emptyForm = { addressLine1: "", addressLine2: "", cityParish: "", country: "" };

export function DeliveryRequestCard({
  packageId,
  initialDelivery,
  defaultAddress,
}: {
  packageId: string;
  initialDelivery: Delivery | null;
  defaultAddress: { addressLine1: string; addressLine2: string; cityParish: string; country: string };
}) {
  const [delivery, setDelivery] = useState(initialDelivery);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [form, setForm] = useState(
    delivery
      ? {
          addressLine1: delivery.addressLine1,
          addressLine2: delivery.addressLine2 ?? "",
          cityParish: delivery.cityParish,
          country: delivery.country,
        }
      : defaultAddress
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openRequestForm() {
    setForm(defaultAddress);
    setError(null);
    setShowForm(true);
  }

  function openEditAddress() {
    if (!delivery) return;
    setForm({
      addressLine1: delivery.addressLine1,
      addressLine2: delivery.addressLine2 ?? "",
      cityParish: delivery.cityParish,
      country: delivery.country,
    });
    setError(null);
    setEditingAddress(true);
  }

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/packages/${packageId}/request-delivery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to request delivery.");
      return;
    }

    setDelivery(data.delivery);
    setShowForm(false);
  }

  async function handleAddressSave(e: FormEvent) {
    e.preventDefault();
    if (!delivery) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/deliveries/${delivery.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to update the delivery address.");
      return;
    }

    setDelivery(data.assignment);
    setEditingAddress(false);
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600";
  const canRequestFresh = !delivery || delivery.status === "FAILED";
  const canEditAddress = delivery && (delivery.status === "REQUESTED" || delivery.status === "ASSIGNED");

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50">
      <h2 className="text-sm font-semibold text-slate-900">Delivery</h2>

      {error && (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {delivery && !editingAddress && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="font-medium text-slate-900">{STATUS_LABELS[delivery.status]}</p>
          {delivery.driver && <p className="text-slate-600">Driver: {delivery.driver.name}</p>}
          <p className="text-slate-600">
            {[delivery.addressLine1, delivery.addressLine2, delivery.cityParish, delivery.country]
              .filter(Boolean)
              .join(", ")}
          </p>
          <p className="text-xs text-slate-400">Requested {formatDateTime(delivery.assignedAt)}</p>
          {canEditAddress && (
            <button
              type="button"
              onClick={openEditAddress}
              className="text-xs font-medium text-teal-700 hover:underline"
            >
              Edit delivery address
            </button>
          )}
        </div>
      )}

      {delivery && editingAddress && (
        <form onSubmit={handleAddressSave} className="mt-3 space-y-3">
          <AddressFields form={form} updateField={updateField} inputClass={inputClass} />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-3 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500 disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save address"}
            </button>
            <button
              type="button"
              onClick={() => setEditingAddress(false)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {canRequestFresh && !showForm && (
        <div className="mt-3">
          {delivery?.status === "FAILED" && (
            <p className="mb-2 text-xs text-slate-500">
              The last delivery attempt failed. You can request delivery again below.
            </p>
          )}
          <button
            type="button"
            onClick={openRequestForm}
            className="rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-3 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500"
          >
            Request delivery
          </button>
        </div>
      )}

      {canRequestFresh && showForm && (
        <form onSubmit={handleRequest} className="mt-3 space-y-3">
          <p className="text-xs text-slate-500">
            Defaulted from your profile address — edit below if this delivery should go elsewhere.
          </p>
          <AddressFields form={form} updateField={updateField} inputClass={inputClass} />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-3 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500 disabled:opacity-60"
            >
              {submitting ? "Requesting…" : "Submit request"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function AddressFields({
  form,
  updateField,
  inputClass,
}: {
  form: typeof emptyForm;
  updateField: (field: keyof typeof emptyForm, value: string) => void;
  inputClass: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Address line 1</label>
        <input
          required
          value={form.addressLine1}
          onChange={(e) => updateField("addressLine1", e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Address line 2</label>
        <input
          value={form.addressLine2}
          onChange={(e) => updateField("addressLine2", e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">City / Parish</label>
          <input
            required
            value={form.cityParish}
            onChange={(e) => updateField("cityParish", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Country</label>
          <input
            required
            value={form.country}
            onChange={(e) => updateField("country", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
