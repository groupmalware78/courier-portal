"use client";

import { useMemo, useState, type FormEvent } from "react";
import { formatPhoneInput, formatPhoneDisplay } from "@/lib/phoneFormat";
import { Pager } from "./Pager";

const PAGE_SIZE = 10;

interface CompanyRow {
  id: string;
  name: string;
  code: string;
  // The full key is never persisted server-side after issuance — only
  // ever available in the response right after create/regenerate (see
  // justRotatedKey below), not from this row's own data afterward.
  apiKeyPrefix: string;
  apiKeyScope: "FULL" | "READ_ONLY";
  apiKeyRotatedAt: string;
  requestsPerMinute: number;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  trn: string | null;
  active: boolean;
  createdAt: string;
}

const emptyForm = {
  name: "",
  contactName: "",
  contactEmail: "",
  address: "",
  trn: "",
};

export function CompaniesView({ initialCompanies }: { initialCompanies: CompanyRow[] }) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  // Separate from `form` — only ever sent on create (the code is
  // immutable once a company exists, since it's already embedded in that
  // company's customer codes, API key emails, invoice filenames, etc.).
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingAccessId, setSavingAccessId] = useState<string | null>(null);
  const [registrationInfo, setRegistrationInfo] = useState<{
    email: string;
    emailSent: boolean;
    otp?: string;
  } | null>(null);
  // Only ever populated from a create/regenerate response — there is no
  // persisted plaintext key to reveal later, so this is the one and only
  // moment the raw key is shown.
  const [justRotatedKey, setJustRotatedKey] = useState<{
    companyId: string;
    companyName: string;
    rawKey: string;
  } | null>(null);

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setCode("");
    setPhone("");
    setError(null);
    setShowForm(true);
  }

  function openEditForm(company: CompanyRow) {
    setEditingId(company.id);
    setForm({
      name: company.name,
      contactName: company.contactName ?? "",
      contactEmail: company.contactEmail ?? "",
      address: company.address ?? "",
      trn: company.trn ?? "",
    });
    setPhone(formatPhoneInput(company.contactPhone ?? ""));
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
      ...form,
      contactPhone: phone,
      ...(editingId ? {} : { code }),
    };

    const res = await fetch(
      editingId ? `/api/companies/${editingId}` : "/api/companies",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to save company.");
      return;
    }

    if (editingId) {
      setCompanies((prev) =>
        prev
          .map((c) => (c.id === editingId ? data.company : c))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } else {
      setCompanies((prev) =>
        [...prev, data.company].sort((a, b) => a.name.localeCompare(b.name))
      );
      setJustRotatedKey({ companyId: data.company.id, companyName: data.company.name, rawKey: data.apiKey });
      setRegistrationInfo({
        email: data.company.contactEmail,
        emailSent: data.emailSent,
        otp: data.otp,
      });
    }
    closeForm();
  }

  async function handleCopy(key: string, id: string) {
    await navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
  }

  async function handleToggleActive(company: CompanyRow, active: boolean) {
    setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, active } : c)));
    await fetch(`/api/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: company.name,
        contactName: company.contactName,
        contactEmail: company.contactEmail,
        contactPhone: company.contactPhone,
        address: company.address ?? "",
        active,
      }),
    });
  }

  async function handleDelete(company: CompanyRow) {
    if (
      !window.confirm(
        `Delete "${company.name}"? Any of its customers or packages will keep their records but lose their company link, and its customer-portal deployment (if registered) will stop resolving. This cannot be undone.`
      )
    )
      return;
    setDeletingId(company.id);
    try {
      const res = await fetch(`/api/companies/${company.id}`, { method: "DELETE" });
      if (res.ok) {
        setCompanies((prev) => prev.filter((c) => c.id !== company.id));
      } else {
        const data = await res.json().catch(() => null);
        window.alert(data?.error ?? "Failed to delete company.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRegenerate(company: CompanyRow) {
    if (
      !window.confirm(
        `Regenerate the API key for "${company.name}"? Their existing customer-portal deployment will stop working until TENANT_API_KEY is updated there.`
      )
    )
      return;
    setRegeneratingId(company.id);
    try {
      const res = await fetch(`/api/companies/${company.id}/regenerate-key`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setCompanies((prev) => prev.map((c) => (c.id === company.id ? data.company : c)));
        setJustRotatedKey({ companyId: company.id, companyName: company.name, rawKey: data.apiKey });
      }
    } finally {
      setRegeneratingId(null);
    }
  }

  async function handleAccessChange(
    company: CompanyRow,
    patch: Partial<Pick<CompanyRow, "apiKeyScope" | "requestsPerMinute">>
  ) {
    setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, ...patch } : c)));
    setSavingAccessId(company.id);
    try {
      const res = await fetch(`/api/companies/${company.id}/access`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKeyScope: patch.apiKeyScope ?? company.apiKeyScope,
          requestsPerMinute: patch.requestsPerMinute ?? company.requestsPerMinute,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, ...data.company } : c)));
      } else {
        // Revert the optimistic update on failure.
        setCompanies((prev) => prev.map((c) => (c.id === company.id ? company : c)));
      }
    } finally {
      setSavingAccessId(null);
    }
  }

  const inputClass =
    "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";

  const totalPages = Math.max(Math.ceil(companies.length / PAGE_SIZE), 1);
  const pagedCompanies = useMemo(
    () => companies.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [companies, page]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Freight Forwarder Companies</h1>
          <p className="text-sm text-slate-500">Partner companies used for co-loading.</p>
        </div>
        <button
          type="button"
          onClick={() => (showForm ? closeForm() : openCreateForm())}
          className="rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-md shadow-violet-600/20 px-3 py-2 text-sm font-medium text-white transition hover:from-violet-500 hover:to-fuchsia-500"
        >
          {showForm ? "Cancel" : "Add company"}
        </button>
      </div>

      {registrationInfo && (
        <div
          className={`flex items-start justify-between gap-3 rounded-md px-3 py-2 text-sm ${
            registrationInfo.emailSent ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"
          }`}
        >
          <div>
            {registrationInfo.emailSent ? (
              <p>Registration email sent to {registrationInfo.email}.</p>
            ) : (
              <>
                <p>
                  RESEND_API_KEY isn&apos;t configured, so no email was sent. Share these with{" "}
                  {registrationInfo.email} manually:
                </p>
                <p className="mt-1 font-mono text-xs">Temporary password (OTP): {registrationInfo.otp}</p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setRegistrationInfo(null)}
            className="shrink-0 text-xs font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {justRotatedKey && (
        <div className="flex items-start justify-between gap-3 rounded-md bg-slate-900 px-3 py-3 text-sm text-white">
          <div className="min-w-0">
            <p className="font-medium">
              New API key for {justRotatedKey.companyName} — copy it now, it won&apos;t be shown again:
            </p>
            <div className="mt-1 flex items-center gap-2">
              <code className="truncate rounded bg-white/10 px-2 py-1 font-mono text-xs">
                {justRotatedKey.rawKey}
              </code>
              <button
                type="button"
                onClick={() => handleCopy(justRotatedKey.rawKey, justRotatedKey.companyId)}
                className="shrink-0 text-xs font-medium underline"
              >
                {copiedId === justRotatedKey.companyId ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setJustRotatedKey(null)}
            className="shrink-0 text-xs font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <p className="col-span-full text-sm font-medium text-slate-700">
            {editingId ? "Edit company" : "New company"}
          </p>
          {error && (
            <div className="col-span-full rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {!editingId && (
            <input
              required
              placeholder="Code (e.g. SLP)"
              maxLength={10}
              size={10}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              className={`w-32 ${inputClass} font-mono uppercase`}
            />
          )}
          <input
            required
            placeholder="Company name"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className={inputClass}
          />
          <input
            required
            placeholder="Contact name"
            value={form.contactName}
            onChange={(e) => updateField("contactName", e.target.value)}
            className={inputClass}
          />
          <input
            required
            type="email"
            placeholder="Contact email"
            value={form.contactEmail}
            onChange={(e) => updateField("contactEmail", e.target.value)}
            className={inputClass}
          />
          <div>
            <input
              required
              type="tel"
              inputMode="numeric"
              pattern="\+1 \(\d{3}\) \d{3}-\d{4}"
              placeholder="+1 (000) 000-0000"
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
              className={inputClass}
            />
          </div>
          <input
            required
            placeholder="Address"
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
            className={inputClass}
          />
          <input
            placeholder="TRN (optional)"
            value={form.trn}
            onChange={(e) => updateField("trn", e.target.value)}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={submitting}
            className="col-span-full rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-md shadow-violet-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-60 sm:col-span-1"
          >
            {submitting ? "Saving…" : editingId ? "Save changes" : "Create company"}
          </button>
        </form>
      )}

      {companies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">No companies added yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">API Key</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Scope</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Rate limit /min</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Active</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedCompanies.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">{c.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-slate-600">{c.code}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs text-slate-500">{c.apiKeyPrefix}…</code>
                      <button
                        type="button"
                        onClick={() => handleRegenerate(c)}
                        disabled={regeneratingId === c.id}
                        className="text-xs font-medium text-amber-600 transition hover:text-amber-800 disabled:opacity-50"
                      >
                        {regeneratingId === c.id ? "Regenerating…" : "Regenerate"}
                      </button>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <select
                      value={c.apiKeyScope}
                      disabled={savingAccessId === c.id}
                      onChange={(e) =>
                        handleAccessChange(c, { apiKeyScope: e.target.value as "FULL" | "READ_ONLY" })
                      }
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-violet-500 focus:outline-none"
                    >
                      <option value="FULL">Full access</option>
                      <option value="READ_ONLY">Read-only</option>
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      value={c.requestsPerMinute}
                      disabled={savingAccessId === c.id}
                      onChange={(e) =>
                        setCompanies((prev) =>
                          prev.map((row) =>
                            row.id === c.id ? { ...row, requestsPerMinute: Number(e.target.value) } : row
                          )
                        )
                      }
                      onBlur={(e) => handleAccessChange(c, { requestsPerMinute: Number(e.target.value) })}
                      className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-violet-500 focus:outline-none"
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {c.contactName || c.contactEmail ? (
                      <>
                        {c.contactName}
                        {c.contactName && c.contactEmail ? " · " : ""}
                        {c.contactEmail}
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {c.contactPhone ? formatPhoneDisplay(c.contactPhone) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={c.active}
                        onChange={(e) => handleToggleActive(c, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      {c.active ? "Active" : "Inactive"}
                    </label>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => openEditForm(c)}
                        className="text-xs font-medium text-slate-600 transition hover:text-slate-900"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        disabled={deletingId === c.id}
                        className="text-xs font-medium text-red-600 transition hover:text-red-800 disabled:opacity-50"
                      >
                        {deletingId === c.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager
            page={page}
            totalPages={totalPages}
            total={companies.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
