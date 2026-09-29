"use client";

import { useState, type FormEvent } from "react";

interface LocationRow {
  id: string;
  name: string;
  address: string;
  contactNumber: string;
  hoursMonFri: string;
  hoursSat: string;
  active: boolean;
  sortOrder: number;
}

const emptyForm = {
  name: "",
  address: "",
  contactNumber: "",
  hoursMonFri: "",
  hoursSat: "",
  active: true,
  sortOrder: "",
};

export function LocationsView({ initialLocations }: { initialLocations: LocationRow[] }) {
  const [locations, setLocations] = useState(initialLocations);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function updateField(field: keyof typeof emptyForm, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEditForm(location: LocationRow) {
    setEditingId(location.id);
    setForm({
      name: location.name,
      address: location.address,
      contactNumber: location.contactNumber,
      hoursMonFri: location.hoursMonFri,
      hoursSat: location.hoursSat,
      active: location.active,
      sortOrder: String(location.sortOrder),
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
      name: form.name,
      address: form.address,
      contactNumber: form.contactNumber,
      hoursMonFri: form.hoursMonFri,
      hoursSat: form.hoursSat,
      active: form.active,
      sortOrder: form.sortOrder || undefined,
    };

    const res = await fetch(
      editingId ? `/api/admin/locations/${editingId}` : "/api/admin/locations",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to save location.");
      return;
    }

    if (editingId) {
      setLocations((prev) =>
        prev
          .map((l) => (l.id === editingId ? data.location : l))
          .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      );
    } else {
      setLocations((prev) =>
        [...prev, data.location].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
        )
      );
    }
    closeForm();
  }

  async function handleDelete(location: LocationRow) {
    if (!window.confirm(`Delete the "${location.name}" location? This cannot be undone.`)) return;
    setDeletingId(location.id);
    try {
      const res = await fetch(`/api/admin/locations/${location.id}`, { method: "DELETE" });
      if (res.ok) {
        setLocations((prev) => prev.filter((l) => l.id !== location.id));
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Locations</h1>
          <p className="text-sm text-slate-500">
            Branch locations shown to customers, including on the signup form.
          </p>
        </div>
        <button
          type="button"
          onClick={() => (showForm ? closeForm() : openCreateForm())}
          className="rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-3 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500"
        >
          {showForm ? "Cancel" : "Add location"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
        >
          <p className="col-span-full text-sm font-medium text-slate-700">
            {editingId ? "Edit location" : "New location"}
          </p>
          {error && (
            <div className="col-span-full rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <input
            required
            placeholder="Name (e.g. Kingston Warehouse)"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className={inputClass}
          />
          <input
            required
            placeholder="Contact number"
            value={form.contactNumber}
            onChange={(e) => updateField("contactNumber", e.target.value)}
            className={inputClass}
          />
          <input
            required
            placeholder="Address"
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
            className={`${inputClass} col-span-full`}
          />
          <input
            required
            placeholder="Mon–Fri hours (e.g. 9:00 AM – 5:00 PM)"
            value={form.hoursMonFri}
            onChange={(e) => updateField("hoursMonFri", e.target.value)}
            className={inputClass}
          />
          <input
            required
            placeholder="Saturday hours (e.g. 9:00 AM – 1:00 PM)"
            value={form.hoursSat}
            onChange={(e) => updateField("hoursSat", e.target.value)}
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
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => updateField("active", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
            />
            Active (visible to customers)
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="col-span-full rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500 disabled:opacity-60 sm:col-span-1"
          >
            {submitting ? "Saving…" : editingId ? "Save changes" : "Create location"}
          </button>
        </form>
      )}

      {locations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">No locations added yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Hours (Mon–Fri / Sat)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {locations.map((location) => (
                <tr key={location.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">{location.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{location.address}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{location.contactNumber}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {location.hoursMonFri} / {location.hoursSat}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        location.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {location.active ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => openEditForm(location)}
                        className="text-xs font-medium text-slate-600 transition hover:text-slate-900"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(location)}
                        disabled={deletingId === location.id}
                        className="text-xs font-medium text-red-600 transition hover:text-red-800 disabled:opacity-50"
                      >
                        {deletingId === location.id ? "Deleting…" : "Delete"}
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
