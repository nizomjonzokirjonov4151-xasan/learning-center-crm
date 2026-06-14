"use client";

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  type Locale,
  type Translations,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  DATE_LOCALES,
  getTranslations,
} from "./index";

export type I18nContextType = {
  locale: Locale;
  t: Translations;
  dateLocale: string;
  changeLocale: (locale: Locale) => void;
};

export const I18nContext = createContext<I18nContextType | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
  if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
    return stored;
  }
  // Fall back to cookie (set by server)
  const cookie = document.cookie
    .split("; ")
    .find((r) => r.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1] as Locale | undefined;
  if (cookie && (SUPPORTED_LOCALES as readonly string[]).includes(cookie)) {
    return cookie;
  }
  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredLocale();
    setLocale(stored);
    setHydrated(true);
  }, []);

  const changeLocale = useCallback(
    (newLocale: Locale) => {
      setLocale(newLocale);
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
      document.cookie = `${LOCALE_COOKIE}=${newLocale}; path=/; max-age=${365 * 24 * 3600}; SameSite=Lax`;
      router.refresh();
    },
    [router]
  );

  const t = getTranslations(locale);
  const dateLocale = DATE_LOCALES[locale];

  // Suppress hydration flash by not rendering children until hydrated
  // We still render so the server HTML matches; locale switches after mount
  return (
    <I18nContext.Provider value={{ locale, t, dateLocale, changeLocale }}>
      {children}
    </I18nContext.Provider>
  );
}
