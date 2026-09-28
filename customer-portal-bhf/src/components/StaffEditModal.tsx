"use client";

import { useState, type FormEvent } from "react";
import { PASSWORD_PATTERN, PASSWORD_REQUIREMENTS_HINT } from "@/lib/passwordSchema";
import { PasswordInput } from "./PasswordInput";

export interface StaffRow {
  id: string;
  name: string;
  email: string;
  role: "CSR" | "DRIVER" | "LOGGER";
  active: boolean;
  createdAt: string;
}

export function StaffEditModal({
  user,
  onClose,
  onUpdated,
}: {
  user: StaffRow;
  onClose: () => void;
  onUpdated: (user: StaffRow) => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<"CSR" | "DRIVER" | "LOGGER">(user.role);
  const [active, setActive] = useState(user.active);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: Record<string, unknown> = { name, email, role, active };
    if (newPassword.trim()) payload.password = newPassword;

    const res = await fetch(`/api/admin/users/${user.id}`, {
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

    onUpdated(data.user as StaffRow);
    onClose();
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-edit-title"
      onClick={onClose}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="staff-edit-title" className="text-base font-semibold text-slate-900">
            Edit staff account
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

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {!user.active && (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              This account is currently deactivated. You can still edit it below.
            </div>
          )}

          <div>
            <label htmlFor="staff-name" className="mb-1 block text-sm font-medium text-slate-700">
              Full name
            </label>
            <input
              id="staff-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="staff-email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="staff-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="staff-role" className="mb-1 block text-sm font-medium text-slate-700">
                Role
              </label>
              <select
                id="staff-role"
                value={role}
                onChange={(e) => setRole(e.target.value as "CSR" | "DRIVER" | "LOGGER")}
                className={inputClass}
              >
                <option value="CSR">Customer Service Rep</option>
                <option value="DRIVER">Driver</option>
                <option value="LOGGER">Logger</option>
              </select>
            </div>
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
              <label className="flex h-[38px] items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {active ? "Active" : "Inactive"}
              </label>
            </div>
          </div>
          <div>
            <label htmlFor="staff-password" className="mb-1 block text-sm font-medium text-slate-700">
              Reset password (optional)
            </label>
            <PasswordInput
              id="staff-password"
              minLength={8}
              pattern={PASSWORD_PATTERN}
              title={PASSWORD_REQUIREMENTS_HINT}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep their current password"
              wrapperClassName="w-full"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-400">
              If set, they&apos;ll be required to choose a new password on next login.
              {" "}
              {PASSWORD_REQUIREMENTS_HINT}.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
