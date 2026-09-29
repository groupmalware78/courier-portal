"use client";

import { useState } from "react";

interface FaqEntry {
  id: string;
  question: string;
  subheader: string | null;
  answer: string;
}

export function FaqAccordion({ faqs }: { faqs: FaqEntry[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50">
      {faqs.map((faq) => {
        const open = openId === faq.id;
        return (
          <div key={faq.id}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : faq.id)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600">
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
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <path d="M12 17h.01" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </span>
                <div>
                  <p className="text-lg font-bold text-slate-900">{faq.question}</p>
                  {faq.subheader && (
                    <p className="mt-0.5 text-xs text-slate-500">{faq.subheader}</p>
                  )}
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {open && (
              <div className="px-5 pb-4 pl-16">
                <p className="whitespace-pre-wrap text-sm text-slate-600">{faq.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
