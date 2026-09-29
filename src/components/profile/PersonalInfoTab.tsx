"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatPhoneInput } from "@/lib/phoneFormat";

interface LocationOption {
  id: string;
  name: string;
  address: string;
}

interface Props {
  initialFirstName: string;
  initialLastName: string;
  initialPhone: string;
  initialStoreLocation: string;
  email: string;
  emailVerified: boolean;
}

export function PersonalInfoTab({
  initialFirstName,
  initialLastName,
  initialPhone,
  initialStoreLocation,
  email,
  emailVerified,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [phone, setPhone] = useState(initialPhone);
  const [storeLocation, setStoreLocation] = useState(initialStoreLocation);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Guards against a rapid double-click on "Enable Edit": the second click
  // lands on the same screen position now occupied by the submit button,
  // which would otherwise save immediately with unedited values.
  const editingSinceRef = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/locations")
      .then((res) => res.json())
      .then((data) => setLocations(data.locations ?? []))
      .catch(() => setLocations([]));
  }, []);

  function cancel() {
    setFirstName(initialFirstName);
    setLastName(initialLastName);
    setPhone(initialPhone);
    setStoreLocation(initialStoreLocation);
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
      body: JSON.stringify({ firstName, lastName, phone, storeLocation }),
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
        <h2 className="text-lg font-semibold text-slate-900">Personal Information</h2>
        <p className="text-sm text-slate-500">Update your personal details and contact information.</p>
      </div>

      {!emailVerified && (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Verify your email address (see Account Details) before updating your profile.
        </div>
      )}
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Profile updated.</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pi-firstName" className="mb-1 block text-sm font-medium text-slate-700">
            First Name*
          </label>
          <input
            id="pi-firstName"
            required
            disabled={!editing}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="pi-lastName" className="mb-1 block text-sm font-medium text-slate-700">
            Last Name*
          </label>
          <input
            id="pi-lastName"
            required
            disabled={!editing}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="pi-phone" className="mb-1 block text-sm font-medium text-slate-700">
            Phone Number*
          </label>
          <input
            id="pi-phone"
            type="tel"
            required
            disabled={!editing}
            pattern="\+1 \(\d{3}\) \d{3}-\d{4}"
            placeholder="+1 (000) 000-0000"
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="pi-email" className="mb-1 block text-sm font-medium text-slate-700">
            Email Address
          </label>
          <input
            id="pi-email"
            disabled
            title="Contact support to change your email address"
            value={email}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Primary Package Pickup Location</h3>
        <div className="mt-2">
          <label htmlFor="pi-storeLocation" className="mb-1 block text-sm font-medium text-slate-700">
            Pickup Location
          </label>
          <select
            id="pi-storeLocation"
            disabled={!editing}
            value={storeLocation}
            onChange={(e) => setStoreLocation(e.target.value)}
            className={inputClass}
          >
            <option value="">Select a location…</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.name}>
                {loc.name} — {loc.address}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">Select to change pickup location</p>
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
