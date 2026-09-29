"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { BarcodeCameraScanner } from "./BarcodeCameraScanner";
import type { Package } from "@/lib/apiTypes";

// Scan (or type) a tracking number to jump straight to a package's edit
// modal, instead of paging/searching through the full /packages list —
// see PackagesTable's "Scan to edit" button. There's no "log as new
// package instead" hand-off here (unlike admin's equivalent modal):
// customer-portal staff don't create packages, only edit ones already
// received.
export function LocatePackageModal({
  onClose,
  onFound,
}: {
  onClose: () => void;
  onFound: (pkg: Package) => void;
}) {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function locate(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;

    setSearching(true);
    setError(null);
    setNotFound(null);

    try {
      const res = await fetch(`/api/packages?q=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        setError("Failed to search for that package.");
        return;
      }
      const data = await res.json();
      const packages = (data.packages ?? []) as Package[];
      // The API does a substring match — narrow to an exact tracking
      // number match, since a scanned barcode should be exact.
      const exact = packages.filter(
        (pkg) => pkg.trackingNumber.toLowerCase() === trimmed.toLowerCase()
      );

      if (exact.length === 1) {
        onFound(exact[0]);
        return;
      }
      if (exact.length > 1) {
        setError("More than one package matched that tracking number — ask an admin for help.");
        return;
      }
      setNotFound(trimmed);
    } catch {
      setError("Network error — could not reach the server.");
    } finally {
      setSearching(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    locate(trackingNumber);
  }

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Hardware barcode scanners act as a keyboard and send Enter after the scan.
    if (e.key === "Enter") {
      e.preventDefault();
      locate(trackingNumber);
    }
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="locate-package-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="locate-package-title" className="text-base font-semibold text-slate-900">
            Scan to edit a package
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
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          {notFound && (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No package found with tracking number &ldquo;{notFound}&rdquo;.
            </div>
          )}

          <div>
            <label htmlFor="locateTrackingNumber" className="mb-1 block text-sm font-medium text-slate-700">
              Tracking number
            </label>
            <input
              ref={inputRef}
              id="locateTrackingNumber"
              type="text"
              autoComplete="off"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Scan or type tracking number, then press Enter"
              className={`font-mono ${inputClass}`}
            />
            <button
              type="button"
              onClick={() => setCameraOpen((v) => !v)}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
              {cameraOpen ? "Hide camera scanner" : "Scan with camera instead"}
            </button>
            {cameraOpen && (
              <div className="mt-2">
                <BarcodeCameraScanner
                  onDetected={(value) => {
                    setCameraOpen(false);
                    setTrackingNumber(value);
                    locate(value);
                  }}
                  onClose={() => setCameraOpen(false)}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={searching || !trackingNumber.trim()}
              className="rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {searching ? "Searching…" : "Find package"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
