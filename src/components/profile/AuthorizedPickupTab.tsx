"use client";

import { useState, type FormEvent } from "react";
import { formatPhoneInput, formatPhoneDisplay } from "@/lib/phoneFormat";

interface Person {
  id: string;
  name: string;
  phone: string | null;
  relationship: string | null;
}

export function AuthorizedPickupTab({ initialPeople }: { initialPeople: Person[] }) {
  const [people, setPeople] = useState(initialPeople);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/profile/authorized-pickup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, relationship }),
    });
    const data = await res.json().catch(() => null);
    setSubmitting(false);

    if (!res.ok) {
      setError(data?.error ?? "Failed to add person.");
      return;
    }

    setPeople((prev) => [...prev, data.person]);
    setName("");
    setPhone("");
    setRelationship("");
    setShowForm(false);
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    const res = await fetch(`/api/profile/authorized-pickup/${id}`, { method: "DELETE" });
    setRemovingId(null);
    if (res.ok) {
      setPeople((prev) => prev.filter((p) => p.id !== id));
    }
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Authorized Pickup</h2>
          <p className="text-sm text-slate-500">
            People you&apos;ve authorized to collect packages on your behalf.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 rounded-full bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500"
        >
          {showForm ? "Cancel" : "Add person"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-3">
          {error && (
            <div className="col-span-full rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <input
            required
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <input
            type="tel"
            placeholder="+1 (000) 000-0000"
            pattern="\+1 \(\d{3}\) \d{3}-\d{4}"
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            className={inputClass}
          />
          <input
            placeholder="Relationship (e.g. Spouse)"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={submitting}
            className="col-span-full rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500 disabled:opacity-60 sm:col-span-1"
          >
            {submitting ? "Adding…" : "Add"}
          </button>
        </form>
      )}

      {people.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center">
          <p className="text-sm text-slate-500">No authorized pickup people added yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {people.map((person) => (
            <li key={person.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{person.name}</p>
                <p className="text-xs text-slate-500">
                  {[person.relationship, formatPhoneDisplay(person.phone)].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(person.id)}
                disabled={removingId === person.id}
                className="shrink-0 text-xs font-medium text-red-600 transition hover:text-red-800 disabled:opacity-50"
              >
                {removingId === person.id ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
