"use client";

import Link from "next/link";

interface PagerProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  // Server-rendered list pages (the common case): pushing ?page=N
  // (preserving every other existing search param) triggers a fresh
  // server render, matching this app's existing searchParams-driven
  // filters (PackageFilterTabs, CustomerSearchInput).
  searchParams?: Record<string, string | undefined>;
  // Client-only lists that already hold every row in memory (e.g. a
  // small/curated staff list): page purely by slicing local state.
  onPageChange?: (page: number) => void;
}

const NAV_BUTTON_CLASS =
  "rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100";
const NAV_BUTTON_DISABLED_CLASS =
  "cursor-not-allowed rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-300";

export function Pager({ page, totalPages, total, pageSize, searchParams, onPageChange }: PagerProps) {
  if (total === 0) return null;

  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  function hrefFor(targetPage: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams ?? {})) {
      if (key === "page") continue;
      if (value) params.set(key, value);
    }
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return query ? `?${query}` : "";
  }

  function renderNav(direction: -1 | 1, label: string) {
    const disabled = direction === -1 ? page <= 1 : page >= totalPages;
    const targetPage = page + direction;

    if (disabled) {
      return <span className={NAV_BUTTON_DISABLED_CLASS}>{label}</span>;
    }
    if (onPageChange) {
      return (
        <button type="button" onClick={() => onPageChange(targetPage)} className={NAV_BUTTON_CLASS}>
          {label}
        </button>
      );
    }
    return (
      <Link href={hrefFor(targetPage)} className={NAV_BUTTON_CLASS}>
        {label}
      </Link>
    );
  }

  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-700">{rangeStart}</span>–
        <span className="font-medium text-slate-700">{rangeEnd}</span> of{" "}
        <span className="font-medium text-slate-700">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {renderNav(-1, "Previous")}
        <span className="text-sm text-slate-500">
          Page {page} of {totalPages}
        </span>
        {renderNav(1, "Next")}
      </div>
    </div>
  );
}
