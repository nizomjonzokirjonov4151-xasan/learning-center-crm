"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";

type Payment = {
  id: string;
  amount: number;
  month: number;
  year: number;
  paymentDate: string;
  note: string | null;
  student: { id: string; fullName: string };
};

type StudentSummary = {
  id: string;
  fullName: string;
  group?: { monthlyFee: number } | null;
};

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function ParentPaymentsPage() {
  const { t, dateLocale } = useTranslation();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = selectedStudent ? `/api/parent/payments?studentId=${selectedStudent}` : "/api/parent/payments";
    setLoading(true);
    setError(null);
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPayments(data.payments ?? []);
        if (!selectedStudent) setStudents(data.students ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [selectedStudent]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric" });

  const targetStudents = selectedStudent ? students.filter((s) => s.id === selectedStudent) : students;
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const paidThisMonth = payments
    .filter((p) => p.month === currentMonth && p.year === currentYear)
    .reduce((s, p) => s + p.amount, 0);
  const totalMonthlyFee = targetStudents.reduce((s, st) => s + (st.group?.monthlyFee ?? 0), 0);
  const currentDebt = Math.max(0, totalMonthlyFee - paidThisMonth);

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:py-10 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.parentPortal.payTitle}</h1>
          <p className="mt-1 text-sm text-gray-500">{t.parentPortal.paySubtitle}</p>
        </div>

        {/* Child selector */}
        {students.length > 1 && (
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="">{t.parentPortal.allChildren}</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.fullName}</option>
            ))}
          </select>
        )}

        {/* Summary cards */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm text-gray-500">{t.parentPortal.totalPaid}</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{totalPaid.toLocaleString()}</p>
              <p className="text-xs text-gray-400">{t.parentPortal.currency}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm text-gray-500">{t.parentPortal.monthlyFee}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalMonthlyFee.toLocaleString()}</p>
              <p className="text-xs text-gray-400">{t.parentPortal.currency}</p>
            </div>
            <div className={`rounded-xl border shadow-sm p-5 ${currentDebt > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
              <p className="text-sm text-gray-500">{t.parentPortal.remainingDebt}</p>
              <p className={`text-2xl font-bold mt-1 ${currentDebt > 0 ? "text-red-600" : "text-gray-400"}`}>
                {currentDebt.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">{t.parentPortal.currency}</p>
            </div>
          </div>
        )}

        {/* Payment history */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">{t.parentPortal.paymentHistory}</h2>
          </div>

          {error ? (
            <div className="px-5 py-10 text-center text-sm text-red-600">{error}</div>
          ) : loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <svg className="animate-spin h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">{t.common.loading}</span>
            </div>
          ) : payments.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-gray-400">{t.parentPortal.noPayments}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t.parentPortal.date}</th>
                    {!selectedStudent && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t.parentPortal.myChildren}</th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t.parentPortal.period}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t.parentPortal.amount}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(p.paymentDate)}</td>
                      {!selectedStudent && (
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.student.fullName}</td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {MONTH_NAMES[p.month - 1]} {p.year}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-emerald-600">{p.amount.toLocaleString()}</span>
                        <span className="text-xs text-gray-400 ml-1">{t.parentPortal.currency}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
