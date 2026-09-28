"use client";

import { useState, type FormEvent } from "react";
import { PASSWORD_PATTERN, PASSWORD_REQUIREMENTS_HINT } from "@/lib/passwordSchema";
import { PasswordInput } from "./PasswordInput";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to change password.");
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  const inputClass =
    "w-full max-w-sm rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Password changed.
        </div>
      )}
      <div>
        <label htmlFor="current-password" className="mb-1 block text-sm font-medium text-slate-700">
          Current password
        </label>
        <PasswordInput
          id="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          wrapperClassName="w-full max-w-sm"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-slate-700">
          New password
        </label>
        <PasswordInput
          id="new-password"
          required
          minLength={8}
          pattern={PASSWORD_PATTERN}
          title={PASSWORD_REQUIREMENTS_HINT}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="At least 8 characters"
          wrapperClassName="w-full max-w-sm"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-slate-400">{PASSWORD_REQUIREMENTS_HINT}</p>
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-slate-700">
          Confirm new password
        </label>
        <PasswordInput
          id="confirm-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          wrapperClassName="w-full max-w-sm"
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
