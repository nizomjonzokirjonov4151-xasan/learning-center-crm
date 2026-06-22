"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

type Student = { id: string; fullName: string; phone: string };

type Group = {
  id: string;
  name: string;
  description: string | null;
  _count: { students: number };
};

type AttendanceRecord = {
  id: string;
  studentId: string;
  groupId: string;
  date: string;
  status: AttendanceStatus;
  student: { id: string; fullName: string };
  group: { id: string; name: string };
};

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { activeClass: string; badgeBg: string; badgeText: string; badgeBorder: string }
> = {
  PRESENT: {
    activeClass: "bg-emerald-500 text-white border-emerald-500",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    badgeBorder: "border-emerald-200",
  },
  ABSENT: {
    activeClass: "bg-red-500 text-white border-red-500",
    badgeBg: "bg-red-50",
    badgeText: "text-red-700",
    badgeBorder: "border-red-200",
  },
  LATE: {
    activeClass: "bg-amber-500 text-white border-amber-500",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-200",
  },
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(isoStr: string, locale: string) {
  return new Date(isoStr).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[status];
  const LABELS = { PRESENT: t.attendance.present, ABSENT: t.attendance.absent, LATE: t.attendance.late };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}`}
    >
      {LABELS[status]}
    </span>
  );
}

function StatusToggle({
  current,
  onChange,
  disabled,
}: {
  current: AttendanceStatus;
  onChange: (s: AttendanceStatus) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const LABELS = { PRESENT: t.attendance.present, ABSENT: t.attendance.absent, LATE: t.attendance.late };
  const statuses: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE"];
  return (
    <div className="inline-flex rounded-lg overflow-hidden border border-gray-200">
      {statuses.map((s, i) => {
        const cfg = STATUS_CONFIG[s];
        const isActive = current === s;
        return (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onChange(s)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              i < 2 ? "border-r border-gray-200" : ""
            } ${isActive ? cfg.activeClass : "bg-white text-gray-500 hover:bg-gray-50"}`}
          >
            {LABELS[s]}
          </button>
        );
      })}
    </div>
  );
}

function Spinner({ size = "sm" }: { size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-6 w-6" : "h-4 w-4";
  return (
    <svg className={`animate-spin ${cls}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function ErrorPill({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

const selectCls =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white";

const inputCls =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white";

export default function AttendancePage() {
  const { t, dateLocale } = useTranslation();
  const [activeTab, setActiveTab] = useState<"mark" | "history">("mark");
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  // ── Mark Attendance ──────────────────────────────────────────────────────
  const [markDate, setMarkDate] = useState(todayISO);
  const [markGroupId, setMarkGroupId] = useState("");
  const [groupStudents, setGroupStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── History ───────────────────────────────────────────────────────────────
  const [histDate, setHistDate] = useState(todayISO);
  const [histGroupId, setHistGroupId] = useState("");
  const [histRecords, setHistRecords] = useState<AttendanceRecord[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ── Load groups ──────────────────────────────────────────────────────────
  useEffect(() => {
    setGroupsLoading(true);
    setGroupsError(null);
    fetch("/api/groups")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setGroups(data);
        } else {
          console.error("[/api/groups] unexpected response:", data);
          setGroupsError(data?.error ?? "Failed to load groups");
        }
      })
      .catch((err) => {
        console.error("[/api/groups] network error:", err);
        setGroupsError("Failed to load groups. Please check your connection.");
      })
      .finally(() => setGroupsLoading(false));
  }, []);

  // ── Load students + existing attendance when markGroupId/markDate changes ─
  useEffect(() => {
    if (!markGroupId) {
      setGroupStudents([]);
      setAttendanceMap({});
      return;
    }
    let cancelled = false;
    setStudentsLoading(true);
    Promise.all([
      fetch(`/api/students?groupId=${markGroupId}`).then((r) => r.json()),
      fetch(`/api/attendance?groupId=${markGroupId}&date=${markDate}`).then((r) => r.json()),
    ])
      .then(([students, existing]: [Student[], AttendanceRecord[]]) => {
        if (cancelled) return;
        setGroupStudents(students);
        const map: Record<string, AttendanceStatus> = {};
        for (const s of students) {
          const found = existing.find((r) => r.studentId === s.id);
          map[s.id] = found?.status ?? "PRESENT";
        }
        setAttendanceMap(map);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setStudentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [markGroupId, markDate]);

  // ── Load history ─────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setHistLoading(true);
    setHistError(null);
    try {
      const params = new URLSearchParams();
      if (histDate) params.set("date", histDate);
      if (histGroupId) params.set("groupId", histGroupId);
      const res = await fetch(`/api/attendance?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setHistRecords(await res.json());
    } catch (e) {
      setHistError(e instanceof Error ? e.message : "Failed to load records");
    } finally {
      setHistLoading(false);
    }
  }, [histDate, histGroupId]);

  useEffect(() => {
    if (activeTab === "history") fetchHistory();
  }, [activeTab, fetchHistory]);

  // ── Save attendance ───────────────────────────────────────────────────────
  async function handleSave() {
    if (!markGroupId || groupStudents.length === 0) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: markGroupId,
          date: markDate,
          records: groupStudents.map((s) => ({
            studentId: s.id,
            status: attendanceMap[s.id] ?? "PRESENT",
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? data.error ?? `HTTP ${res.status}`);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  }

  // ── History: update status inline ─────────────────────────────────────────
  async function handleUpdateStatus(id: string, status: AttendanceStatus) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/attendance/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setHistRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  }

  // ── History: delete ───────────────────────────────────────────────────────
  async function handleDeleteRecord(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/attendance/${id}`, { method: "DELETE" });
      setHistRecords((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  // ── Summary counts (mark tab) ─────────────────────────────────────────────
  const statusCounts = Object.values(attendanceMap).reduce(
    (acc, s) => ({ ...acc, [s]: (acc[s] ?? 0) + 1 }),
    {} as Record<AttendanceStatus, number>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:py-10 sm:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.attendance.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{t.attendance.subtitle}</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-6">
            {(["mark", "history"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "mark" ? t.attendance.markAttendance : t.attendance.viewHistory}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Mark Attendance tab ────────────────────────────────────────── */}
        {activeTab === "mark" && (
          <div className="space-y-6">
            {/* Controls */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    {t.common.date}
                  </label>
                  <input
                    type="date"
                    value={markDate}
                    onChange={(e) => setMarkDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="flex-1 min-w-48">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    {t.nav.groups}
                  </label>
                  <select
                    value={markGroupId}
                    onChange={(e) => setMarkGroupId(e.target.value)}
                    className={`${selectCls} w-full`}
                    disabled={groupsLoading || !!groupsError}
                  >
                    <option value="">{t.attendance.selectGroup}</option>
                    {Array.isArray(groups) && groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g._count.students} {t.attendance.groupWithStudents})
                      </option>
                    ))}
                  </select>
                  {groupsError && (
                    <p className="mt-1.5 text-xs text-red-600">{groupsError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Student list */}
            {!markGroupId ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-16 text-gray-400">
                <svg className="w-10 h-10 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                <p className="text-sm">{t.attendance.selectGroupPrompt}</p>
              </div>
            ) : studentsLoading ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center gap-2 py-16 text-gray-400">
                <Spinner size="md" />
                <span className="text-sm">{t.attendance.loadingStudents}</span>
              </div>
            ) : groupStudents.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-16 text-gray-400">
                <p className="text-sm">{t.attendance.noStudents}</p>
                <a href="/students" className="mt-2 text-sm text-blue-600 hover:underline">
                  {t.attendance.assignStudents}
                </a>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Summary bar */}
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">
                      {groupStudents.length} {groupStudents.length !== 1 ? t.common.students : t.common.student}
                    </span>
                    {(["PRESENT", "ABSENT", "LATE"] as AttendanceStatus[]).map((s) => {
                      const LABELS = { PRESENT: t.attendance.present, ABSENT: t.attendance.absent, LATE: t.attendance.late };
                      return (
                        <span key={s} className={`font-medium ${STATUS_CONFIG[s].badgeText}`}>
                          {statusCounts[s] ?? 0} {LABELS[s].toLowerCase()}
                        </span>
                      );
                    })}
                  </div>
                  <span className="text-xs text-gray-400">{formatDisplayDate(markDate, dateLocale)}</span>
                </div>

                {/* Student rows */}
                <div className="divide-y divide-gray-50">
                  {groupStudents.map((student, i) => (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between px-5 py-3.5 gap-4 ${
                        i % 2 === 0 ? "" : "bg-gray-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                          {student.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {student.fullName}
                        </span>
                      </div>
                      <StatusToggle
                        current={attendanceMap[student.id] ?? "PRESENT"}
                        onChange={(s) =>
                          setAttendanceMap((prev) => ({ ...prev, [student.id]: s }))
                        }
                        disabled={saving}
                      />
                    </div>
                  ))}
                </div>

                {/* Save bar */}
                <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-4 flex-wrap">
                  {saveError && <ErrorPill message={saveError} />}
                  {saveSuccess && (
                    <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      {t.attendance.attendanceSaved}
                    </span>
                  )}
                  {!saveError && !saveSuccess && <span />}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving && <Spinner />}
                    {saving ? t.common.saving : t.attendance.saveAttendance}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── History tab ───────────────────────────────────────────────── */}
        {activeTab === "history" && (
          <div className="space-y-5">
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    {t.common.date}
                  </label>
                  <input
                    type="date"
                    value={histDate}
                    onChange={(e) => setHistDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="flex-1 min-w-48">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    {t.nav.groups}
                  </label>
                  <select
                    value={histGroupId}
                    onChange={(e) => setHistGroupId(e.target.value)}
                    className={`${selectCls} w-full`}
                    disabled={groupsLoading || !!groupsError}
                  >
                    <option value="">{t.attendance.allGroups}</option>
                    {Array.isArray(groups) && groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={fetchHistory}
                  disabled={histLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {histLoading ? <Spinner /> : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  )}
                  {t.common.refresh}
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">{t.attendance.attendanceRecords}</h2>
                {!histLoading && (
                  <span className="text-sm text-gray-400">
                    {histRecords.length} {t.common.records}
                  </span>
                )}
              </div>

              {histError && <div className="p-5"><ErrorPill message={histError} /></div>}

              {histLoading ? (
                <div className="flex items-center justify-center gap-2 py-14 text-gray-400">
                  <Spinner size="md" />
                  <span className="text-sm">{t.attendance.loadingRecords}</span>
                </div>
              ) : histRecords.length === 0 && !histError ? (
                <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                  <svg className="w-9 h-9 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  <p className="text-sm">{t.attendance.noRecords}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {[t.students.fullName, t.nav.groups, t.common.date, t.common.status, t.common.actions].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {histRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {record.student.fullName}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{record.group.name}</td>
                          <td className="px-4 py-3 text-gray-500">
                            {formatDisplayDate(record.date, dateLocale)}
                          </td>
                          <td className="px-4 py-3">
                            {updatingId === record.id ? (
                              <span className="flex items-center gap-1 text-gray-400 text-xs">
                                <Spinner /> {t.attendance.updating}
                              </span>
                            ) : (
                              <select
                                value={record.status}
                                onChange={(e) =>
                                  handleUpdateStatus(record.id, e.target.value as AttendanceStatus)
                                }
                                className={`${selectCls} py-1 text-xs`}
                              >
                                <option value="PRESENT">{t.attendance.present}</option>
                                <option value="ABSENT">{t.attendance.absent}</option>
                                <option value="LATE">{t.attendance.late}</option>
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {deletingId === record.id ? (
                              <span className="flex items-center gap-1 text-gray-400 text-xs">
                                <Spinner /> {t.common.deleting}
                              </span>
                            ) : (
                              <button
                                onClick={() => handleDeleteRecord(record.id)}
                                className="inline-flex items-center gap-1 rounded border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                              >
                                {t.common.delete}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
