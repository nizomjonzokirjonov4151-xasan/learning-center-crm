"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  type Locale,
  SUPPORTED_LOCALES,
  LANGUAGE_LABELS,
  LANGUAGE_FLAGS,
} from "@/lib/i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, changeLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-lg transition-colors text-sm font-medium ${
          compact
            ? "px-2 py-1.5 text-gray-400 hover:text-white hover:bg-gray-800"
            : "px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200"
        }`}
        title="Change language"
        aria-label="Change language"
      >
        <span>{LANGUAGE_FLAGS[locale]}</span>
        {!compact && (
          <span className="hidden sm:inline">{LANGUAGE_LABELS[locale]}</span>
        )}
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""} ${compact ? "text-gray-500" : "text-gray-400"}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-1 w-44 rounded-xl bg-white border border-gray-200 shadow-lg overflow-hidden ${
            compact ? "bottom-full mb-1 left-0" : "right-0 top-full"
          }`}
        >
          {(SUPPORTED_LOCALES as readonly Locale[]).map((loc) => (
            <button
              key={loc}
              onClick={() => {
                changeLocale(loc);
                setOpen(false);
              }}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm transition-colors text-left ${
                locale === loc
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="text-base">{LANGUAGE_FLAGS[loc]}</span>
              <span>{LANGUAGE_LABELS[loc]}</span>
              {locale === loc && (
                <svg className="ml-auto w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
