"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";

type TeacherInfo = { id: string; fullName: string; subject: string };
type ScheduleEntry = {
  id: string;
  startTime: string;
  endTime: string;
  room: string;
  teacher: TeacherInfo;
  group: { name: string };
};
type StudentData = {
  id: string;
  fullName: string;
  phone: string;
  createdAt: string;
  group: { id: string; name: string; monthlyFee: number } | null;
  attendanceRate: number;
  currentDebt: number;
  todaysSchedules: ScheduleEntry[];
};

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl border p-5 ${color}`}>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export default function ParentDashboardPage() {
  const { t, dateLocale } = useTranslation();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/parent/dashboard")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setStudents(data);
        else setError(data.error ?? "Failed to load");
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const totalChildren = students.length;
  const avgAttendance = totalChildren > 0
    ? Math.round(students.reduce((s, c) => s + c.attendanceRate, 0) / totalChildren)
    : 0;
  const totalDebt = students.reduce((s, c) => s + c.currentDebt, 0);
  const activeGroups = new Set(students.map((s) => s.group?.id).filter(Boolean)).size;
  const allTodaysClasses = students.flatMap((s) => s.todaysSchedules);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric" });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <svg className="animate-spin h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="rounded-xl bg-red-50 border border-red-200 px-6 py-4 text-red-700 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:py-10 sm:px-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.parentPortal.dashTitle}</h1>
          <p className="mt-1 text-sm text-gray-500">{t.parentPortal.dashSubtitle}</p>
        </div>

        {students.length === 0 ? (
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">{t.parentPortal.noChildren}</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label={t.parentPortal.totalChildren} value={totalChildren} color="bg-white border-gray-200 shadow-sm" />
              <StatCard label={t.parentPortal.attendanceRate} value={`${avgAttendance}%`} color="bg-white border-gray-200 shadow-sm" />
              <StatCard label={t.parentPortal.currentDebt} value={totalDebt.toLocaleString()} sub={t.parentPortal.currency} color="bg-white border-gray-200 shadow-sm" />
              <StatCard label={t.parentPortal.activeGroups} value={activeGroups} color="bg-white border-gray-200 shadow-sm" />
            </div>

            {/* Student Cards */}
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-4">{t.parentPortal.myChildren}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map((s) => (
                  <div key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold uppercase flex-shrink-0">
                        {s.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{s.fullName}</p>
                        <p className="text-xs text-gray-400">{t.parentPortal.enrolledDate}: {formatDate(s.createdAt)}</p>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">{t.parentPortal.group}</span>
                        <span className="font-medium text-gray-900">{s.group?.name ?? "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">{t.parentPortal.attendanceRate}</span>
                        <span className={`font-medium ${s.attendanceRate >= 80 ? "text-emerald-600" : s.attendanceRate >= 60 ? "text-amber-600" : "text-red-600"}`}>
                          {s.attendanceRate}%
                        </span>
                      </div>
                      {s.currentDebt > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">{t.parentPortal.currentDebt}</span>
                          <span className="font-medium text-red-600">{s.currentDebt.toLocaleString()} {t.parentPortal.currency}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Classes */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">{t.parentPortal.todaysClasses}</h2>
              </div>
              {allTodaysClasses.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-400">{t.parentPortal.noClassesToday}</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {allTodaysClasses.map((sc) => (
                    <li key={sc.id} className="px-5 py-4 flex items-center gap-4 flex-wrap sm:flex-nowrap">
                      <div className="w-16 text-center flex-shrink-0">
                        <p className="text-sm font-semibold text-gray-900">{sc.startTime}</p>
                        <p className="text-xs text-gray-400">{sc.endTime}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{sc.group.name}</p>
                        <p className="text-xs text-gray-500">{sc.teacher.fullName} · {sc.teacher.subject}</p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{t.parentPortal.room}: {sc.room}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
