"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";

export interface FilterCategory {
  key: string;
  label: string;
  icon: React.ReactNode;
}

export function PackageFilterTabs({
  categories,
  gradientFrom,
  gradientVia,
  gradientTo,
}: {
  categories: FilterCategory[];
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("filter") ?? "all";
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(direction: -1 | 1) {
    scrollRef.current?.scrollBy({ left: direction * 220, behavior: "smooth" });
  }

  function hrefFor(key: string) {
    if (key === "all") return pathname;
    return `${pathname}?filter=${key}`;
  }

  return (
    <div
      className="flex items-center gap-1 rounded-full p-1.5 shadow-sm"
      style={{
        background: `linear-gradient(to right, ${gradientFrom}, ${gradientVia}, ${gradientTo})`,
      }}
    >
      <button
        type="button"
        onClick={() => scroll(-1)}
        className="shrink-0 rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
        aria-label="Scroll filters left"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <div ref={scrollRef} className="flex flex-1 gap-1 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((cat) => {
          const isActive = active === cat.key;
          return (
            <Link
              key={cat.key}
              href={hrefFor(cat.key)}
              className={clsx(
                "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                isActive ? "bg-white text-slate-900 shadow" : "text-white/85 hover:bg-white/10"
              )}
            >
              {cat.icon}
              <span className="whitespace-nowrap">{cat.label}</span>
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => scroll(1)}
        className="shrink-0 rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
        aria-label="Scroll filters right"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
