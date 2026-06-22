"use client";

import { useActionState, useEffect, useState } from "react";
import { login, type LoginState } from "@/lib/auth-actions";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { LanguageSwitcher } from "@/app/components/LanguageSwitcher";
import { Button } from "@/app/components/ui/Button";

function BrandPanel() {
  const { t } = useTranslation();
  const highlights = [t.auth.highlightStudents, t.auth.highlightPayments, t.auth.highlightInsights];

  return (
    <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 px-12 py-12 text-white overflow-hidden">
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
      <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-white/5" />

      <div className="relative flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg flex-shrink-0">
          <span className="text-white font-black text-base">O</span>
        </div>
        <span className="font-semibold text-sm tracking-tight">{t.auth.title}</span>
      </div>

      <div className="relative">
        <h1 className="text-3xl font-bold tracking-tight leading-tight max-w-sm">
          {t.auth.tagline}
        </h1>
        <ul className="mt-8 space-y-4">
          {highlights.map((h) => (
            <li key={h} className="flex items-start gap-3 text-sm text-blue-100">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-white/15 flex items-center justify-center">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </span>
              {h}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-blue-200/70">
        {t.auth.copyright} {new Date().getFullYear()}
      </p>
    </div>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    fetch("/api/auth/setup")
      .then((r) => r.json())
      .then((d) => setNeedsSetup(d.needsSetup === true))
      .catch(() => setNeedsSetup(false));
  }, []);

  return (
    <div className="min-h-screen flex bg-white">
      <BrandPanel />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-gray-50 lg:bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile-only logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white font-black text-2xl">O</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t.auth.title}</h1>
            <p className="text-gray-500 text-sm mt-1">{t.auth.subtitle}</p>
          </div>

          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t.auth.signIn}</h2>
              <p className="text-sm text-gray-500 mt-1">{t.auth.subtitle}</p>
            </div>
            <LanguageSwitcher />
          </div>

          {needsSetup && (
            <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-sm font-semibold text-amber-800 mb-1">{t.auth.firstTimeSetup}</p>
              <p className="text-xs text-amber-700 mb-3">{t.auth.noAccountsYet}</p>
              <a
                href="/setup"
                className="inline-block text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                {t.auth.createAdminAccount}
              </a>
            </div>
          )}

          <form action={action} className="space-y-4">
            {from && (
              <input type="hidden" name="from" value={from} />
            )}

            {state?.error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                {state.error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1.5">
                {t.auth.emailLabel}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder={t.auth.emailPlaceholder}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1.5">
                {t.auth.passwordLabel}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 focus:bg-white"
              />
            </div>

            <Button type="submit" loading={pending} disabled={pending} className="w-full !py-3 !rounded-xl mt-2">
              {pending ? t.auth.signingIn : t.auth.signIn}
            </Button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            {t.auth.contactAdmin}
          </p>

          <p className="lg:hidden text-xs text-gray-400 text-center mt-6">
            {t.auth.copyright} {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
