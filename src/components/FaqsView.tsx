"use client";

import { useState, type FormEvent } from "react";

interface FaqRow {
  id: string;
  question: string;
  subheader: string | null;
  answer: string;
  active: boolean;
  sortOrder: number;
}

const emptyForm = {
  question: "",
  subheader: "",
  answer: "",
  active: true,
  sortOrder: "",
};

export function FaqsView({ initialFaqs }: { initialFaqs: FaqRow[] }) {
  const [faqs, setFaqs] = useState(initialFaqs);
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

  function openEditForm(faq: FaqRow) {
    setEditingId(faq.id);
    setForm({
      question: faq.question,
      subheader: faq.subheader ?? "",
      answer: faq.answer,
      active: faq.active,
      sortOrder: String(faq.sortOrder),
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
      question: form.question,
      subheader: form.subheader || undefined,
      answer: form.answer,
      active: form.active,
      sortOrder: form.sortOrder || undefined,
    };

    const res = await fetch(editingId ? `/api/admin/faqs/${editingId}` : "/api/admin/faqs", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to save FAQ.");
      return;
    }

    if (editingId) {
      setFaqs((prev) =>
        prev
          .map((f) => (f.id === editingId ? data.faq : f))
          .sort((a, b) => a.sortOrder - b.sortOrder)
      );
    } else {
      setFaqs((prev) => [...prev, data.faq].sort((a, b) => a.sortOrder - b.sortOrder));
    }
    closeForm();
  }

  async function handleDelete(faq: FaqRow) {
    if (!window.confirm(`Delete this FAQ? This cannot be undone.`)) return;
    setDeletingId(faq.id);
    try {
      const res = await fetch(`/api/admin/faqs/${faq.id}`, { method: "DELETE" });
      if (res.ok) {
        setFaqs((prev) => prev.filter((f) => f.id !== faq.id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">FAQ</h1>
          <p className="text-sm text-slate-500">
            Shown as an accordion on the public homepage.
          </p>
        </div>
        <button
          type="button"
          onClick={() => (showForm ? closeForm() : openCreateForm())}
          className="rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-3 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500"
        >
          {showForm ? "Cancel" : "Add question"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <p className="text-sm font-medium text-slate-700">
            {editingId ? "Edit question" : "New question"}
          </p>
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <input
            required
            placeholder="Question"
            value={form.question}
            onChange={(e) => updateField("question", e.target.value)}
            className={inputClass}
          />
          <input
            placeholder="Sub header (optional)"
            value={form.subheader}
            onChange={(e) => updateField("subheader", e.target.value)}
            className={inputClass}
          />
          <textarea
            required
            placeholder="Answer"
            value={form.answer}
            onChange={(e) => updateField("answer", e.target.value)}
            rows={4}
            className={inputClass}
          />
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-32">
              <input
                type="number"
                step="1"
                placeholder="Sort order"
                value={form.sortOrder}
                onChange={(e) => updateField("sortOrder", e.target.value)}
                className={inputClass}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => updateField("active", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
              />
              Active (visible to customers)
            </label>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500 disabled:opacity-60"
          >
            {submitting ? "Saving…" : editingId ? "Save changes" : "Create question"}
          </button>
        </form>
      )}

      {faqs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">No FAQs added yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {faqs.map((faq) => (
            <div key={faq.id} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-md shadow-slate-200/50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{faq.question}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        faq.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {faq.active ? "Active" : "Hidden"}
                    </span>
                  </div>
                  {faq.subheader && (
                    <p className="mt-0.5 text-xs text-slate-500">{faq.subheader}</p>
                  )}
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{faq.answer}</p>
                </div>
                <div className="flex shrink-0 gap-3">
                  <button
                    type="button"
                    onClick={() => openEditForm(faq)}
                    className="text-xs font-medium text-slate-600 transition hover:text-slate-900"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(faq)}
                    disabled={deletingId === faq.id}
                    className="text-xs font-medium text-red-600 transition hover:text-red-800 disabled:opacity-50"
                  >
                    {deletingId === faq.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
