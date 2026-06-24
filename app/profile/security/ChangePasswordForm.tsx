"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { PasswordInput } from "@/app/components/ui/PasswordInput";

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function ChangePasswordForm({
  forcePasswordChange,
}: {
  forcePasswordChange: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function setField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setError(t.security.passwordMismatch);
      return;
    }
    if (form.newPassword.length < 8) {
      setError(t.security.minChars);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to change password.");
        return;
      }
      setSuccess(true);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      // If forced, redirect home now that it's cleared
      if (forcePasswordChange) {
        router.push("/");
        router.refresh();
      } else {
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">{t.security.changePassword}</h2>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4 max-w-md">
        <div>
          <label className={labelCls}>{t.security.currentPassword} <span className="text-red-500">*</span></label>
          <PasswordInput
            value={form.currentPassword}
            onChange={(e) => setField("currentPassword", e.target.value)}
            required
            autoComplete="current-password"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>{t.security.newPassword} <span className="text-red-500">*</span></label>
          <PasswordInput
            value={form.newPassword}
            onChange={(e) => setField("newPassword", e.target.value)}
            required
            minLength={8}
            placeholder={t.security.minChars}
            autoComplete="new-password"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>{t.security.confirmPassword} <span className="text-red-500">*</span></label>
          <PasswordInput
            value={form.confirmPassword}
            onChange={(e) => setField("confirmPassword", e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className={inputCls}
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            {t.security.passwordChanged}
          </div>
        )}

        <div className="pt-1">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {saving && <Spinner />}
            {saving ? t.common.saving : t.security.savePassword}
          </button>
        </div>
      </form>
    </div>
  );
}
