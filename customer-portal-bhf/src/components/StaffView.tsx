"use client";

import { useMemo, useState, type FormEvent } from "react";
import { StaffEditModal, type StaffRow } from "./StaffEditModal";
import { PASSWORD_PATTERN, PASSWORD_REQUIREMENTS_HINT } from "@/lib/passwordSchema";
import { PasswordInput } from "./PasswordInput";
import { ROLE_LABELS } from "@/lib/rbac";
import { Pager } from "./Pager";

const PAGE_SIZE = 10;

export function StaffView({ initialStaff }: { initialStaff: StaffRow[] }) {
  const [staff, setStaff] = useState(initialStaff);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"CSR" | "DRIVER" | "LOGGER">("CSR");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffRow | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create account.");
      return;
    }

    setStaff((prev) => [...prev, data.user]);
    setShowForm(false);
    setName("");
    setEmail("");
    setPassword("");
    setRole("CSR");
  }

  async function handleToggleActive(id: string, active: boolean) {
    setStaff((prev) => prev.map((u) => (u.id === id ? { ...u, active } : u)));
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
  }

  function handleUserUpdated(updated: StaffRow) {
    setStaff((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  const inputClass =
    "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  const totalPages = Math.max(Math.ceil(staff.length / PAGE_SIZE), 1);
  const pagedStaff = useMemo(
    () => staff.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [staff, page]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Staff</h1>
          <p className="text-sm text-slate-500">Manage CSR, driver, and logger accounts for this portal.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-3 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500"
        >
          {showForm ? "Cancel" : "Add staff"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {error && (
            <div className="col-span-full rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <input
            required
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <PasswordInput
            required
            minLength={8}
            pattern={PASSWORD_PATTERN}
            title={PASSWORD_REQUIREMENTS_HINT}
            placeholder="Temporary password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            wrapperClassName="w-full"
            className={`${inputClass} w-full`}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "CSR" | "DRIVER" | "LOGGER")}
            className={inputClass}
          >
            <option value="CSR">Customer Service Rep</option>
            <option value="DRIVER">Driver</option>
            <option value="LOGGER">Logger</option>
          </select>
          <p className="col-span-full -mt-1 text-xs text-slate-400">{PASSWORD_REQUIREMENTS_HINT}</p>
          <button
            type="submit"
            disabled={submitting}
            className="col-span-full rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500 disabled:opacity-60 sm:col-span-1"
          >
            {submitting ? "Creating…" : "Create account"}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Active</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagedStaff.map((u) => (
              <tr key={u.id}>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">{u.name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{u.email}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                  {ROLE_LABELS[u.role]}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={u.active}
                      onChange={(e) => handleToggleActive(u.id, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    {u.active ? "Active" : "Inactive"}
                  </label>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setEditingUser(u)}
                    className="text-xs font-medium text-slate-600 transition hover:text-slate-900"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager
          page={page}
          totalPages={totalPages}
          total={staff.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      {editingUser && (
        <StaffEditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdated={handleUserUpdated}
        />
      )}
    </div>
  );
}
