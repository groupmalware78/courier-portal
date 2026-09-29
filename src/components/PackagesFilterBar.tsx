"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { STATUS_LABELS, type PackageStatus } from "./StatusBadge";

const ALL_STATUSES = Object.keys(STATUS_LABELS) as PackageStatus[];

export function PackagesFilterBar({
  initialQ,
  initialStatus,
  initialDateFrom,
  initialDateTo,
}: {
  initialQ: string;
  initialStatus: string;
  initialDateFrom: string;
  initialDateTo: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Mirrors the URL's params, but updated optimistically the moment we push
  // a new one (see updateParam) rather than only once Next.js finishes the
  // round-trip and searchParams reflects it. Without that, picking "From"
  // and then quickly picking "To" before the first navigation lands would
  // have the second call read pre-"From" params and silently drop it.
  const searchParamsRef = useRef(new URLSearchParams(searchParams.toString()));
  useEffect(() => {
    searchParamsRef.current = new URLSearchParams(searchParams.toString());
  }, [searchParams]);

  const [q, setQ] = useState(initialQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParamsRef.current.toString());
    params.delete("page");
    if (value) params.set(key, value);
    else params.delete(key);
    // Update the ref immediately so a second updateParam call fired before
    // this navigation lands (e.g. setting "To" right after "From") builds
    // on top of this change instead of a stale, pre-change snapshot.
    searchParamsRef.current = params;
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  useEffect(() => {
    // Skip on mount: q already matches the URL then, so there's nothing
    // to push, and running it anyway is what let a stale-timer fire
    // hazard exist in the first place.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParam("q", q.trim()), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function clearAll() {
    setQ("");
    searchParamsRef.current = new URLSearchParams();
    router.push(pathname);
  }

  const hasFilters = !!(initialQ || initialStatus || initialDateFrom || initialDateTo);
  const inputClass =
    "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600";

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="min-w-[220px] flex-1">
        <label htmlFor="packages-search" className="mb-1 block text-xs font-medium text-slate-500">
          Search
        </label>
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            id="packages-search"
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tracking number, customer name, or TRN…"
            className={`w-full pl-9 ${inputClass}`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="packages-status" className="mb-1 block text-xs font-medium text-slate-500">
          Status
        </label>
        <select
          id="packages-status"
          key={initialStatus}
          defaultValue={initialStatus}
          onChange={(e) => updateParam("status", e.target.value)}
          className={inputClass}
        >
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="packages-date-from" className="mb-1 block text-xs font-medium text-slate-500">
          From
        </label>
        <input
          id="packages-date-from"
          key={initialDateFrom}
          type="date"
          defaultValue={initialDateFrom}
          onChange={(e) => updateParam("dateFrom", e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="packages-date-to" className="mb-1 block text-xs font-medium text-slate-500">
          To
        </label>
        <input
          id="packages-date-to"
          key={initialDateTo}
          type="date"
          defaultValue={initialDateTo}
          onChange={(e) => updateParam("dateTo", e.target.value)}
          className={inputClass}
        />
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="mb-0.5 text-xs font-medium text-slate-500 transition hover:text-slate-900"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
