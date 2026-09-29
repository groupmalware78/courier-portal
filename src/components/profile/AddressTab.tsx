"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const COUNTRIES = [
  "Jamaica",
  "United States",
  "Canada",
  "United Kingdom",
  "Trinidad and Tobago",
  "Barbados",
  "Bahamas",
  "Guyana",
  "Other",
];

interface Props {
  initialAddressLine1: string;
  initialAddressLine2: string;
  initialCityParish: string;
  initialCountry: string;
  emailVerified: boolean;
}

export function AddressTab({
  initialAddressLine1,
  initialAddressLine2,
  initialCityParish,
  initialCountry,
  emailVerified,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [addressLine1, setAddressLine1] = useState(initialAddressLine1);
  const [addressLine2, setAddressLine2] = useState(initialAddressLine2);
  const [cityParish, setCityParish] = useState(initialCityParish);
  const [country, setCountry] = useState(initialCountry || "Jamaica");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Guards against a rapid double-click on "Enable Edit": the second click
  // lands on the same screen position now occupied by the submit button,
  // which would otherwise save immediately with unedited values.
  const editingSinceRef = useRef<number | null>(null);

  function cancel() {
    setAddressLine1(initialAddressLine1);
    setAddressLine2(initialAddressLine2);
    setCityParish(initialCityParish);
    setCountry(initialCountry || "Jamaica");
    setEditing(false);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (editingSinceRef.current && Date.now() - editingSinceRef.current < 400) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressLine1, addressLine2, cityParish, country }),
    });
    const data = await res.json().catch(() => null);
    setSubmitting(false);

    if (!res.ok) {
      setError(data?.error ?? "Failed to save changes.");
      return;
    }

    setSuccess(true);
    setEditing(false);
    router.refresh();
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-500 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Address</h2>
        <p className="text-sm text-slate-500">Your personal address on file.</p>
      </div>

      {!emailVerified && (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Verify your email address (see Account Details) before updating your address.
        </div>
      )}
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Address updated.</div>
      )}

      <div>
        <label htmlFor="addr-line1" className="mb-1 block text-sm font-medium text-slate-700">
          Address Line 1*
        </label>
        <input
          id="addr-line1"
          required
          disabled={!editing}
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="addr-line2" className="mb-1 block text-sm font-medium text-slate-700">
          Address Line 2
        </label>
        <input
          id="addr-line2"
          disabled={!editing}
          value={addressLine2}
          onChange={(e) => setAddressLine2(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="addr-city" className="mb-1 block text-sm font-medium text-slate-700">
            City / Parish*
          </label>
          <input
            id="addr-city"
            required
            disabled={!editing}
            value={cityParish}
            onChange={(e) => setCityParish(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="addr-country" className="mb-1 block text-sm font-medium text-slate-700">
            Country*
          </label>
          <select
            id="addr-country"
            required
            disabled={!editing}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={inputClass}
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {editing ? (
          <>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-5 py-2 text-sm font-semibold text-white transition hover:from-teal-500 hover:to-cyan-500 disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Update Profile"}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={!emailVerified}
            title={emailVerified ? undefined : "Verify your email address first"}
            onClick={() => {
              editingSinceRef.current = Date.now();
              setEditing(true);
              setSuccess(false);
            }}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-600"
          >
            Enable Edit
          </button>
        )}
      </div>
    </form>
  );
}
