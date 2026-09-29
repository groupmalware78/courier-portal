"use client";

import { useState } from "react";

export function EmailVerifiedBadge({ verified }: { verified: boolean }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    setSending(true);
    setError(null);
    const res = await fetch("/api/profile/resend-verification", { method: "POST" });
    const data = await res.json().catch(() => null);
    setSending(false);

    if (!res.ok) {
      setError(data?.error ?? "Failed to send verification email.");
      return;
    }
    setSent(true);
  }

  if (verified) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="m9 11 3 3L22 4" />
        </svg>
        Verified
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
        Not verified
      </span>
      {sent ? (
        <span className="text-xs text-slate-500">Verification email sent</span>
      ) : (
        <button
          type="button"
          onClick={handleResend}
          disabled={sending}
          className="text-xs font-medium text-teal-700 underline underline-offset-2 hover:text-teal-900 disabled:opacity-60"
        >
          {sending ? "Sending…" : "Resend verification email"}
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
