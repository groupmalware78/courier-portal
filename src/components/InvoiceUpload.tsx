"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/formatDateTime";

interface Props {
  packageId: string;
  hasInvoice: boolean;
  invoiceFileName: string | null;
  invoiceUploadedAt: string | null;
}

export function InvoiceUpload({ packageId, hasInvoice, invoiceFileName, invoiceUploadedAt }: Props) {
  const invoiceUrl = hasInvoice ? `/api/my-shipments/${packageId}/invoice` : null;
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/my-shipments/${packageId}/invoice`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => null);
    setUploading(false);

    if (!res.ok) {
      setError(data?.error ?? "Failed to upload invoice.");
      return;
    }

    router.refresh();
  }

  return (
    <div>
      {error && (
        <div className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {invoiceUrl ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <a
            href={invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 items-center gap-2 text-sm font-medium text-teal-700 hover:underline"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 shrink-0"
            >
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            </svg>
            <span className="truncate">{invoiceFileName ?? "Invoice"}</span>
          </a>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="shrink-0 text-xs font-medium text-slate-500 transition hover:text-slate-900 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Replace"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:border-teal-400 hover:text-teal-700 disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <path d="M12 18v-6" />
            <path d="m9 15 3-3 3 3" />
          </svg>
          {uploading ? "Uploading…" : "Add invoice"}
        </button>
      )}

      {invoiceUploadedAt && (
        <p className="mt-1 text-xs text-slate-400">
          Uploaded {formatDateTime(invoiceUploadedAt)}
        </p>
      )}
      <p className="mt-1 text-xs text-slate-400">PDF, JPEG, or PNG — up to 10MB.</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
