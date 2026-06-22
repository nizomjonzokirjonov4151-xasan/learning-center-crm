"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";

type AttendanceRecord = {
  id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  student: { id: string; fullName: string };
  group: { id: string; name: string };
};

type Student = { id: string; fullName: string };

const STATUS_STYLES = {
  PRESENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ABSENT: "bg-red-50 text-red-700 border-red-200",
  LATE: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function ParentAttendancePage() {
  const { t, dateLocale } = useTranslation();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async (studentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = studentId ? `/api/parent/attendance?studentId=${studentId}` : "/api/parent/attendance";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecords(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load — fetch all attendance, extract student list
  useEffect(() => {
    fetch("/api/parent/attendance")
      .then((r) => r.json())
      .then((data: AttendanceRecord[]) => {
        if (!Array.isArray(data)) { setError("Failed to load"); return; }
        setRecords(data);
        const seen = new Set<string>();
        const list: Student[] = [];
        data.forEach((r) => {
          if (!seen.has(r.student.id)) {
            seen.add(r.student.id);
            list.push(r.student);
          }
        });
        setStudents(list);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (students.length > 0) fetchRecords(selectedStudent);
  }, [selectedStudent, fetchRecords, students.length]);

  const statusLabel = (s: "PRESENT" | "ABSENT" | "LATE") => {
    if (s === "PRESENT") return t.parentPortal.present;
    if (s === "ABSENT") return t.parentPortal.absent;
    return t.parentPortal.late;
  };

  const total = records.length;
  const present = records.filter((r) => r.status === "PRESENT").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const late = records.filter((r) => r.status === "LATE").length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:py-10 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.parentPortal.attTitle}</h1>
          <p className="mt-1 text-sm text-gray-500">{t.parentPortal.attSubtitle}</p>
        </div>

        {/* Child selector */}
        {students.length > 1 && (
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="">{t.parentPortal.allChildren}</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.fullName}</option>
            ))}
          </select>
        )}

        {/* Stats */}
        {!loading && total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{rate}%</p>
              <p className="text-xs text-gray-500 mt-1">{t.parentPortal.rate}</p>
            </div>
            <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{present}</p>
              <p className="text-xs text-gray-500 mt-1">{t.parentPortal.presentCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-red-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{absent}</p>
              <p className="text-xs text-gray-500 mt-1">{t.parentPortal.absentCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{late}</p>
              <p className="text-xs text-gray-500 mt-1">{t.parentPortal.lateCount}</p>
            </div>
          </div>
        )}

        {/* Records table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
          ) : records.length === 0 ? (
            <div className="px-5 py-16 text-center text-sm text-gray-400">{t.parentPortal.noAttendance}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t.parentPortal.date}</th>
                    {!selectedStudent && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t.parentPortal.myChildren}</th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t.parentPortal.group}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t.parentPortal.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(r.date)}</td>
                      {!selectedStudent && (
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.student.fullName}</td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-600">{r.group.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                          {statusLabel(r.status)}
                        </span>
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
