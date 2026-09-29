"use client";

import { useState, type FormEvent } from "react";

interface RateRow {
  id: string;
  label: string;
  minWeightLbs: number;
  maxWeightLbs: number | null;
  price: number;
  sortOrder: number;
}

const emptyForm = {
  label: "",
  minWeightLbs: "",
  maxWeightLbs: "",
  price: "",
  sortOrder: "",
};

export function RatesView({ initialRates }: { initialRates: RateRow[] }) {
  const [rates, setRates] = useState(initialRates);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEditForm(rate: RateRow) {
    setEditingId(rate.id);
    setForm({
      label: rate.label,
      minWeightLbs: String(rate.minWeightLbs),
      maxWeightLbs: rate.maxWeightLbs != null ? String(rate.maxWeightLbs) : "",
      price: String(rate.price),
      sortOrder: String(rate.sortOrder),
    });
    setError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      label: form.label,
      minWeightLbs: form.minWeightLbs,
      maxWeightLbs: form.maxWeightLbs || undefined,
      price: form.price,
      sortOrder: form.sortOrder || undefined,
    };

    const res = await fetch(editingId ? `/api/admin/rates/${editingId}` : "/api/admin/rates", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to save rate.");
      return;
    }

    if (editingId) {
      setRates((prev) =>
        prev
          .map((r) => (r.id === editingId ? data.rate : r))
          .sort((a, b) => a.sortOrder - b.sortOrder || a.minWeightLbs - b.minWeightLbs)
      );
    } else {
      setRates((prev) =>
        [...prev, data.rate].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.minWeightLbs - b.minWeightLbs
        )
      );
    }
    closeForm();
  }

  async function handleDelete(rate: RateRow) {
    if (!window.confirm(`Delete the "${rate.label}" rate? This cannot be undone.`)) return;
    setDeletingId(rate.id);
    try {
      const res = await fetch(`/api/admin/rates/${rate.id}`, { method: "DELETE" });
      if (res.ok) {
        setRates((prev) => prev.filter((r) => r.id !== rate.id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  const inputClass =
    "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Shipping Rates</h1>
          <p className="text-sm text-slate-500">
            Weight-based pricing shown on the public homepage and calculator.
          </p>
        </div>
        <button
          type="button"
          onClick={() => (showForm ? closeForm() : openCreateForm())}
          className="rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-3 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500"
        >
          {showForm ? "Cancel" : "Add rate"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <p className="col-span-full text-sm font-medium text-slate-700">
            {editingId ? "Edit rate" : "New rate"}
          </p>
          {error && (
            <div className="col-span-full rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <input
            required
            placeholder="Label (e.g. Standard)"
            value={form.label}
            onChange={(e) => updateField("label", e.target.value)}
            className={inputClass}
          />
          <input
            required
            type="number"
            min="0"
            step="0.1"
            placeholder="Min weight (lbs)"
            value={form.minWeightLbs}
            onChange={(e) => updateField("minWeightLbs", e.target.value)}
            className={inputClass}
          />
          <input
            type="number"
            min="0"
            step="0.1"
            placeholder="Max weight (lbs, optional)"
            value={form.maxWeightLbs}
            onChange={(e) => updateField("maxWeightLbs", e.target.value)}
            className={inputClass}
          />
          <input
            required
            type="number"
            min="0"
            step="0.01"
            placeholder="Price ($)"
            value={form.price}
            onChange={(e) => updateField("price", e.target.value)}
            className={inputClass}
          />
          <input
            type="number"
            step="1"
            placeholder="Sort order"
            value={form.sortOrder}
            onChange={(e) => updateField("sortOrder", e.target.value)}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={submitting}
            className="col-span-full rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500 disabled:opacity-60 sm:col-span-1"
          >
            {submitting ? "Saving…" : editingId ? "Save changes" : "Create rate"}
          </button>
        </form>
      )}

      {rates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">No shipping rates added yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Label</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Weight range</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rates.map((rate) => (
                <tr key={rate.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">{rate.label}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {rate.minWeightLbs} lbs – {rate.maxWeightLbs != null ? `${rate.maxWeightLbs} lbs` : "up"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    ${rate.price.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => openEditForm(rate)}
                        className="text-xs font-medium text-slate-600 transition hover:text-slate-900"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(rate)}
                        disabled={deletingId === rate.id}
                        className="text-xs font-medium text-red-600 transition hover:text-red-800 disabled:opacity-50"
                      >
                        {deletingId === rate.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
