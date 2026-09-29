"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";

const ICON_PROPS = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-4 w-4",
};

const PERSON_ICON = (
  <svg {...ICON_PROPS}>
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 0 0-16 0" />
  </svg>
);

const PIN_ICON = (
  <svg {...ICON_PROPS}>
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const LOCK_ICON = (
  <svg {...ICON_PROPS}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const PEOPLE_ICON = (
  <svg {...ICON_PROPS}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const TABS = [
  { id: "personal", label: "Personal Info", icon: PERSON_ICON },
  { id: "address", label: "Address", icon: PIN_ICON },
  { id: "security", label: "Security", icon: LOCK_ICON },
  { id: "pickup", label: "Authorized Pickup", icon: PEOPLE_ICON },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ProfileTabs({
  personalInfo,
  address,
  security,
  authorizedPickup,
  gradientFrom,
  gradientVia,
  gradientTo,
}: {
  personalInfo: ReactNode;
  address: ReactNode;
  security: ReactNode;
  authorizedPickup: ReactNode;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
}) {
  const [active, setActive] = useState<TabId>("personal");

  const content: Record<TabId, ReactNode> = {
    personal: personalInfo,
    address,
    security,
    pickup: authorizedPickup,
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50">
      <div
        className="flex overflow-x-auto"
        style={{
          background: `linear-gradient(to right, ${gradientFrom}, ${gradientVia}, ${gradientTo})`,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={clsx(
              "flex shrink-0 items-center gap-2 px-5 py-3.5 text-sm font-medium transition",
              active === tab.id ? "bg-white" : "text-white/80 hover:bg-white/10"
            )}
            style={active === tab.id ? { color: gradientFrom } : undefined}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-6">{content[active]}</div>
    </div>
  );
}
