"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";

type Debtor = {
  id: string;
  fullName: string;
  phone: string;
  groupName: string;
  monthlyFee: number;
  amountPaid: number;
  remainingDebt: number;
  daysOverdue: number;
};

type Filter = "all" | "7days" | "30days";

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function OverdueBadge({ days }: { days: number }) {
  let cls = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ";
  let label = `${days}d`;
  if (days > 30) cls += "bg-red-100 text-red-700 border border-red-200";
  else if (days > 7) cls += "bg-orange-100 text-orange-700 border border-orange-200";
  else cls += "bg-yellow-100 text-yellow-700 border border-yellow-200";
  return <span className={cls}>{label}</span>;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-gray-50">
      {[150, 100, 90, 90, 90, 100, 70].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3.5 rounded bg-gray-200" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

export default function DebtorsPage() {
  const { t, dateLocale } = useTranslation();
  const fmt = (n: number) => new Intl.NumberFormat(dateLocale).format(Math.round(n));
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const fetchDebtors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/debtors");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? data.error ?? `HTTP ${res.status}`);
      }
      setDebtors(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load debtors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDebtors();
  }, [fetchDebtors]);

  const filtered = debtors.filter((d) => {
    if (filter === "7days") return d.daysOverdue > 7;
    if (filter === "30days") return d.daysOverdue > 30;
    return true;
  });

  const totalDebt = debtors.reduce((s, d) => s + d.remainingDebt, 0);
  const debtorCount = debtors.length;

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: t.debtors.allDebtors },
    { key: "7days", label: t.debtors.overdue7 },
    { key: "30days", label: t.debtors.overdue30 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:py-10 sm:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t.debtors.title}</h1>
            <p className="mt-1 text-sm text-gray-500">{t.debtors.subtitle}</p>
          </div>
          <button
            onClick={fetchDebtors}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {loading ? <Spinner /> : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            )}
            {t.common.refresh}
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">{t.debtors.numberOfDebtors}</p>
                {loading ? (
                  <div className="mt-1 h-7 w-12 rounded bg-gray-200 animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-red-600">{debtorCount}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">{t.debtors.totalDebtAmount}</p>
                {loading ? (
                  <div className="mt-1 h-7 w-32 rounded bg-gray-200 animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-orange-600">{fmt(totalDebt)} UZS</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors border ${
                filter === key
                  ? "bg-red-600 border-red-600 text-white shadow-sm"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {label}
              {!loading && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                  filter === key ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600"
                }`}>
                  {key === "all"
                    ? debtors.length
                    : key === "7days"
                    ? debtors.filter((d) => d.daysOverdue > 7).length
                    : debtors.filter((d) => d.daysOverdue > 30).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <span className="text-sm text-red-700">{error}</span>
            <button onClick={fetchDebtors} className="ml-auto text-sm font-medium text-red-700 underline hover:no-underline">{t.common.retry}</button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              {filter === "all" ? t.debtors.allDebtors : filter === "7days" ? t.debtors.overdueMore7 : t.debtors.overdueMore30}
            </h2>
            {!loading && (
              <span className="text-sm text-gray-400">
                {filtered.length} {filtered.length !== 1 ? t.common.students : t.common.student}
              </span>
            )}
          </div>

          {loading ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {[t.debtors.studentName, t.students.phone, t.debtors.group, t.debtors.monthlyFee, t.debtors.amountPaid, t.debtors.remainingDebt, t.debtors.daysOverdue].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
                </tbody>
              </table>
            </div>
          ) : !error && filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">
                {filter === "all" ? t.debtors.noDebtors : t.debtors.noStudentsMatch}
              </p>
              <p className="text-xs text-gray-400 mt-1">{t.debtors.setFeeHint}</p>
            </div>
          ) : !error ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {[t.debtors.studentName, t.students.phone, t.debtors.group, t.debtors.monthlyFee, t.debtors.amountPaid, t.debtors.remainingDebt, t.debtors.daysOverdue].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{d.fullName}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{d.phone}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-100">
                          {d.groupName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {fmt(d.monthlyFee)} UZS
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={d.amountPaid > 0 ? "text-emerald-600 font-medium" : "text-gray-400"}>
                          {fmt(d.amountPaid)} UZS
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-red-600">{fmt(d.remainingDebt)} UZS</span>
                      </td>
                      <td className="px-4 py-3">
                        <OverdueBadge days={d.daysOverdue} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary row */}
              <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 flex flex-wrap items-center gap-6">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{t.debtors.filteredTotals}</span>
                <span className="text-sm text-gray-700">
                  <span className="font-semibold">{filtered.length}</span> {filtered.length !== 1 ? t.common.students : t.common.student}
                </span>
                <span className="text-sm text-gray-700">
                  {t.debtors.paid} <span className="font-semibold text-emerald-600">{fmt(filtered.reduce((s, d) => s + d.amountPaid, 0))} UZS</span>
                </span>
                <span className="text-sm text-gray-700">
                  {t.debtors.remaining} <span className="font-semibold text-red-600">{fmt(filtered.reduce((s, d) => s + d.remainingDebt, 0))} UZS</span>
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Info note */}
        {!loading && !error && (
          <p className="text-xs text-gray-400 text-center">
            Showing debt for current month and previous month. Set monthly fees in{" "}
            <a href="/groups" className="underline hover:text-gray-600">Groups</a>.
            Telegram sends a daily debtors summary at 21:00.
          </p>
        )}
      </div>
    </div>
  );
}
