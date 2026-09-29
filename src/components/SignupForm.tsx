"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { PASSWORD_PATTERN, PASSWORD_REQUIREMENTS_HINT } from "@/lib/passwordSchema";
import { formatPhoneInput } from "@/lib/phoneFormat";
import { API_KEY_PROBLEM_FRIENDLY_MESSAGE } from "@/lib/apiErrors";
import { PasswordInput } from "./PasswordInput";

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

const emptyForm = {
  firstName: "",
  middleInitial: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  workPhone: "",
  addressLine1: "",
  addressLine2: "",
  cityParish: "",
  country: "Jamaica",
  trn: "",
  storeLocation: "",
};

function Field({
  label,
  id,
  required,
  children,
}: {
  label: string;
  id: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

interface LocationOption {
  id: string;
  name: string;
  address: string;
}

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<LocationOption[]>([]);

  useEffect(() => {
    fetch("/api/locations")
      .then((res) => res.json())
      .then((data) => setLocations(data.locations ?? []))
      .catch(() => setLocations([]));
  }, []);

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (!agreeToTerms) {
      setError("You must agree to the Terms and Conditions");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, agreeToTerms }),
    });
    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "Failed to create account.");
      return;
    }

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      setError(
        result.code === "api-key-problem"
          ? API_KEY_PROBLEM_FRIENDLY_MESSAGE
          : "Account created, but sign-in failed — try signing in manually."
      );
      return;
    }

    router.push("/my-shipments");
    router.refresh();
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-200/70 bg-white p-6 shadow-md shadow-slate-200/50"
    >
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-[2fr_1fr_2fr] gap-2 sm:gap-4">
        <Field label="First name" id="firstName" required>
          <input
            id="firstName"
            required
            autoFocus
            value={form.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="M.I." id="middleInitial" required>
          <input
            id="middleInitial"
            required
            maxLength={3}
            value={form.middleInitial}
            onChange={(e) => updateField("middleInitial", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Last name" id="lastName" required>
          <input
            id="lastName"
            required
            value={form.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Email" id="email" required>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </Field>
        <Field label="Phone" id="phone" required>
          <input
            id="phone"
            type="tel"
            required
            pattern="\+1 \(\d{3}\) \d{3}-\d{4}"
            placeholder="+1 (000) 000-0000"
            value={form.phone}
            onChange={(e) => updateField("phone", formatPhoneInput(e.target.value))}
            className={inputClass}
          />
        </Field>

        <Field label="Password" id="password" required>
          <PasswordInput
            id="password"
            required
            minLength={8}
            pattern={PASSWORD_PATTERN}
            title={PASSWORD_REQUIREMENTS_HINT}
            value={form.password}
            onChange={(e) => updateField("password", e.target.value)}
            placeholder="At least 8 characters"
            wrapperClassName="w-full"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-400">{PASSWORD_REQUIREMENTS_HINT}</p>
        </Field>
        <Field label="Confirm password" id="confirmPassword" required>
          <PasswordInput
            id="confirmPassword"
            required
            minLength={8}
            value={form.confirmPassword}
            onChange={(e) => updateField("confirmPassword", e.target.value)}
            wrapperClassName="w-full"
            className={inputClass}
          />
        </Field>

        <Field label="Address line 1" id="addressLine1" required>
          <input
            id="addressLine1"
            required
            value={form.addressLine1}
            onChange={(e) => updateField("addressLine1", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Address line 2" id="addressLine2">
          <input
            id="addressLine2"
            value={form.addressLine2}
            onChange={(e) => updateField("addressLine2", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="City / Parish" id="cityParish" required>
          <input
            id="cityParish"
            required
            value={form.cityParish}
            onChange={(e) => updateField("cityParish", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Country" id="country" required>
          <select
            id="country"
            required
            value={form.country}
            onChange={(e) => updateField("country", e.target.value)}
            className={inputClass}
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Work phone" id="workPhone">
          <input
            id="workPhone"
            type="tel"
            pattern="\+1 \(\d{3}\) \d{3}-\d{4}"
            placeholder="+1 (000) 000-0000"
            value={form.workPhone}
            onChange={(e) => updateField("workPhone", formatPhoneInput(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="TRN" id="trn" required>
          <input
            id="trn"
            required
            value={form.trn}
            onChange={(e) => updateField("trn", e.target.value)}
            placeholder="Tax Registration Number"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Preferred store location" id="storeLocation">
        {locations.length > 0 ? (
          <select
            id="storeLocation"
            value={form.storeLocation}
            onChange={(e) => updateField("storeLocation", e.target.value)}
            className={inputClass}
          >
            <option value="">Select a location…</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.name}>
                {loc.name} — {loc.address}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="storeLocation"
            value={form.storeLocation}
            onChange={(e) => updateField("storeLocation", e.target.value)}
            className={inputClass}
          />
        )}
      </Field>

      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={agreeToTerms}
          onChange={(e) => setAgreeToTerms(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
        />
        <span>
          I agree to the{" "}
          <Link href="/terms" target="_blank" className="font-medium text-teal-700 hover:underline">
            Terms and Conditions
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" className="font-medium text-teal-700 hover:underline">
            Privacy Policy
          </Link>
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-gradient-to-r from-cyan-500 to-blue-500 px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Creating account…" : "Sign up"}
      </button>
    </form>
  );
}
