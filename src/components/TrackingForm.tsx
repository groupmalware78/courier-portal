"use client";

import { useState, type FormEvent } from "react";
import { formatDateTime } from "@/lib/formatDateTime";
import { StatusBadge } from "./StatusBadge";

interface TrackedPackage {
  trackingNumber: string;
  status:
    | "RECEIVED"
    | "READY_FOR_PICKUP"
    | "SHIPPED"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "DAMAGED"
    | "EMPTY_PACKAGE"
    | "RETURNED";
  weightLbs: number | null;
  description: string | null;
  receivedAt: string | null;
  company: { name: string } | null;
}

export function TrackingForm() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackedPackage | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!trackingNumber.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `/api/track?trackingNumber=${encodeURIComponent(trackingNumber.trim())}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setResult(data.package as TrackedPackage);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/5"
      >
        <input
          type="text"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="Enter your tracking number"
          className="flex-1 rounded-lg border-0 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !trackingNumber.trim()}
          className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Searching…" : "Track"}
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm text-slate-900">{result.trackingNumber}</span>
            <StatusBadge status={result.status} />
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Received at
              </dt>
              <dd className="mt-1 text-slate-700">
                {result.receivedAt ? formatDateTime(result.receivedAt) : "Not yet received"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Carrier
              </dt>
              <dd className="mt-1 text-slate-700">{result.company?.name ?? "—"}</dd>
            </div>
            {result.weightLbs != null && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Weight
                </dt>
                <dd className="mt-1 text-slate-700">{result.weightLbs} lbs</dd>
              </div>
            )}
            {result.description && (
              <div className="col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Description
                </dt>
                <dd className="mt-1 text-slate-700">{result.description}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
