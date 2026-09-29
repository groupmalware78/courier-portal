"use client";

import { useState, type FormEvent } from "react";
import type { FeeBasis } from "@/lib/apiTypes";
import clsx from "clsx";

interface FeeRangeRow {
  id: string;
  basis: FeeBasis;
  label: string;
  min: number;
  max: number | null;
  fee: number;
  sortOrder: number;
}

const emptyForm = { label: "", min: "", max: "", fee: "", sortOrder: "" };

const TABS: { basis: FeeBasis; label: string; unit: string }[] = [
  { basis: "WEIGHT", label: "By Weight", unit: "lbs" },
  { basis: "VALUE", label: "By Value", unit: "$" },
];

export function FeesView({
  initialWeightRanges,
  initialValueRanges,
}: {
  initialWeightRanges: FeeRangeRow[];
  initialValueRanges: FeeRangeRow[];
}) {
  const [activeTab, setActiveTab] = useState<FeeBasis>("WEIGHT");
  const [weightRanges, setWeightRanges] = useState(initialWeightRanges);
  const [valueRanges, setValueRanges] = useState(initialValueRanges);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const ranges = activeTab === "WEIGHT" ? weightRanges : valueRanges;
  const setRanges = activeTab === "WEIGHT" ? setWeightRanges : setValueRanges;
  const tab = TABS.find((t) => t.basis === activeTab)!;

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function switchTab(basis: FeeBasis) {
    setActiveTab(basis);
    setShowForm(false);
    setEditingId(null);
    setError(null);
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEditForm(range: FeeRangeRow) {
    setEditingId(range.id);
    setForm({
      label: range.label,
      min: String(range.min),
      max: range.max != null ? String(range.max) : "",
      fee: String(range.fee),
      sortOrder: String(range.sortOrder),
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
      basis: activeTab,
      label: form.label,
      min: form.min,
      max: form.max || undefined,
      fee: form.fee,
      sortOrder: form.sortOrder || undefined,
    };

    const res = await fetch(editingId ? `/api/admin/fees/${editingId}` : "/api/admin/fees", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to save fee tier.");
      return;
    }

    if (editingId) {
      setRanges((prev) =>
        prev
          .map((r) => (r.id === editingId ? data.feeRange : r))
          .sort((a, b) => a.sortOrder - b.sortOrder || a.min - b.min)
      );
    } else {
      setRanges((prev) => [...prev, data.feeRange].sort((a, b) => a.sortOrder - b.sortOrder || a.min - b.min));
    }
    closeForm();
  }

  async function handleDelete(range: FeeRangeRow) {
    if (!window.confirm(`Delete the "${range.label}" fee tier? This cannot be undone.`)) return;
    setDeletingId(range.id);
    try {
      const res = await fetch(`/api/admin/fees/${range.id}`, { method: "DELETE" });
      if (res.ok) {
        setRanges((prev) => prev.filter((r) => r.id !== range.id));
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fee Settings</h1>
          <p className="text-sm text-slate-500">
            Configure fee tiers used by the fee calculator — one set by weight, one by declared value.
          </p>
        </div>
        <button
          type="button"
          onClick={() => (showForm ? closeForm() : openCreateForm())}
          className="rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-3 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500"
        >
          {showForm ? "Cancel" : "Add fee tier"}
        </button>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.basis}
            type="button"
            onClick={() => switchTab(t.basis)}
            className={clsx(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition",
              activeTab === t.basis
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <p className="col-span-full text-sm font-medium text-slate-700">
            {editingId ? "Edit fee tier" : `New ${tab.label.toLowerCase()} fee tier`}
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
            step="0.01"
            placeholder={`Min ${tab.unit}`}
            value={form.min}
            onChange={(e) => updateField("min", e.target.value)}
            className={inputClass}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder={`Max ${tab.unit} (optional)`}
            value={form.max}
            onChange={(e) => updateField("max", e.target.value)}
            className={inputClass}
          />
          <input
            required
            type="number"
            min="0"
            step="0.01"
            placeholder="Fee ($)"
            value={form.fee}
            onChange={(e) => updateField("fee", e.target.value)}
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
            {submitting ? "Saving…" : editingId ? "Save changes" : "Create fee tier"}
          </button>
        </form>
      )}

      {ranges.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">No {tab.label.toLowerCase()} fee tiers added yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Label</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {activeTab === "WEIGHT" ? "Weight range" : "Value range"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Fee</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ranges.map((range) => (
                <tr key={range.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">{range.label}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {activeTab === "WEIGHT" ? `${range.min} lbs` : `$${range.min.toFixed(2)}`} –{" "}
                    {range.max != null ? (activeTab === "WEIGHT" ? `${range.max} lbs` : `$${range.max.toFixed(2)}`) : "up"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">${range.fee.toFixed(2)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => openEditForm(range)}
                        className="text-xs font-medium text-slate-600 transition hover:text-slate-900"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(range)}
                        disabled={deletingId === range.id}
                        className="text-xs font-medium text-red-600 transition hover:text-red-800 disabled:opacity-50"
                      >
                        {deletingId === range.id ? "Deleting…" : "Delete"}
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
