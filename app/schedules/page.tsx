"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";

// JS getDay(): 0=Sun,1=Mon,...,6=Sat → schema: 1=Mon,...,7=Sun
const JS_DAY_TO_SCHEMA = [7, 1, 2, 3, 4, 5, 6];

type Group = { id: string; name: string; description: string | null };
type Teacher = { id: string; fullName: string; subject: string; isActive: boolean };
type Schedule = {
  id: string;
  groupId: string;
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
  group: Group;
  teacher: Teacher;
};

type FormState = {
  groupId: string;
  teacherId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
};

const EMPTY_FORM: FormState = {
  groupId: "",
  teacherId: "",
  dayOfWeek: "1",
  startTime: "09:00",
  endTime: "10:30",
  room: "",
};

export default function SchedulesPage() {
  const { t } = useTranslation();

  const DAYS = [
    { value: 1, label: t.parentPortal.monday },
    { value: 2, label: t.parentPortal.tuesday },
    { value: 3, label: t.parentPortal.wednesday },
    { value: 4, label: t.parentPortal.thursday },
    { value: 5, label: t.parentPortal.friday },
    { value: 6, label: t.parentPortal.saturday },
    { value: 7, label: t.parentPortal.sunday },
  ].map((d) => ({ ...d, short: d.label.slice(0, 3) }));

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Schedule | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const todaySchemaDay = JS_DAY_TO_SCHEMA[new Date().getDay()];

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/schedules").then((r) => r.json()),
      fetch("/api/groups").then((r) => r.json()),
      fetch("/api/teachers").then((r) => r.json()),
    ])
      .then(([sched, grps, tchs]) => {
        setSchedules(Array.isArray(sched) ? sched : []);
        setGroups(Array.isArray(grps) ? grps : []);
        setTeachers(Array.isArray(tchs) ? tchs : []);
      })
      .catch(() => setPageError(t.schedules.loadFailed))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(s: Schedule) {
    setEditTarget(s);
    setForm({
      groupId: s.groupId,
      teacherId: s.teacherId,
      dayOfWeek: String(s.dayOfWeek),
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room,
    });
    setFormError("");
    setModalOpen(true);
  }

  function setField(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.groupId || !form.teacherId || !form.startTime || !form.endTime || !form.room.trim()) {
      setFormError(t.schedules.allFieldsRequired);
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const url = editTarget ? `/api/schedules/${editTarget.id}` : "/api/schedules";
      const method = editTarget ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, dayOfWeek: Number(form.dayOfWeek) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? t.schedules.saveFailed);
        return;
      }
      if (editTarget) {
        setSchedules((prev) => prev.map((s) => (s.id === editTarget.id ? data : s)));
      } else {
        setSchedules((prev) => [...prev, data]);
      }
      setModalOpen(false);
    } catch {
      setFormError(t.schedules.networkError);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/schedules/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        setSchedules((prev) => prev.filter((s) => s.id !== deleteId));
        setDeleteId(null);
      }
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  }

  const byDay = DAYS.map((d) => ({
    ...d,
    isToday: d.value === todaySchemaDay,
    items: schedules
      .filter((s) => s.dayOfWeek === d.value)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));

  const activeTeachers = teachers.filter((tch) => tch.isActive);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">{t.schedules.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:py-10 sm:px-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t.schedules.title}</h1>
            <p className="mt-1 text-sm text-gray-500">{t.schedules.subtitle}</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t.schedules.addSchedule}
          </button>
        </div>

        {pageError && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            {pageError}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {DAYS.slice(0, 4).map((d) => {
            const count = schedules.filter((s) => s.dayOfWeek === d.value).length;
            const isToday = d.value === todaySchemaDay;
            return (
              <div
                key={d.value}
                className={`rounded-xl border p-4 shadow-sm ${isToday ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"}`}
              >
                <p className={`text-xs font-semibold uppercase tracking-wide ${isToday ? "text-blue-600" : "text-gray-400"}`}>
                  {d.short}{isToday && ` · ${t.schedules.today}`}
                </p>
                <p className={`text-2xl font-bold mt-1 ${isToday ? "text-blue-900" : "text-gray-900"}`}>{count}</p>
                <p className={`text-xs mt-0.5 ${isToday ? "text-blue-500" : "text-gray-400"}`}>
                  {count === 1 ? t.schedules.classSingular : t.schedules.classPlural}
                </p>
              </div>
            );
          })}
        </div>

        {/* Weekly timetable */}
        <div className="space-y-3">
          {byDay.map(({ value, label, isToday, items }) => (
            <div
              key={value}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isToday ? "border-blue-300 ring-1 ring-blue-200" : "border-gray-200"}`}
            >
              {/* Day header */}
              <div className={`px-5 py-3 border-b flex items-center justify-between ${isToday ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-center gap-2">
                  <h2 className={`text-sm font-bold ${isToday ? "text-blue-700" : "text-gray-700"}`}>{label}</h2>
                  {isToday && (
                    <span className="text-xs font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-full">{t.schedules.today}</span>
                  )}
                </div>
                <span className={`text-xs font-medium ${isToday ? "text-blue-500" : "text-gray-400"}`}>
                  {items.length} {items.length === 1 ? t.schedules.classSingular : t.schedules.classPlural}
                </span>
              </div>

              {items.length === 0 ? (
                <div className="px-5 py-5 text-sm text-gray-400 italic">{t.schedules.noClassesScheduled}</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {items.map((s) => (
                    <div key={s.id} className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        {/* Time block */}
                        <div className="flex-shrink-0 text-center">
                          <div className="bg-blue-50 text-blue-800 text-xs font-bold px-3 py-2 rounded-lg min-w-[76px]">
                            <div className="text-sm">{s.startTime}</div>
                            <div className="text-blue-300 text-xs leading-none my-0.5">│</div>
                            <div className="text-sm">{s.endTime}</div>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 text-sm leading-tight">{s.group.name}</p>
                          {s.group.description && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{s.group.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                              </svg>
                              {s.teacher.fullName}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 21V10.75m0 0l9-7.25m0 0l9 7.25" />
                              </svg>
                              {t.schedules.roomPrefix} {s.room}
                            </span>
                            <span className="text-xs bg-violet-50 text-violet-700 font-medium px-2 py-0.5 rounded-full">
                              {s.teacher.subject}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                        <button
                          onClick={() => openEdit(s)}
                          className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {t.common.edit}
                        </button>
                        <button
                          onClick={() => setDeleteId(s.id)}
                          className="text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {t.common.delete}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {schedules.length === 0 && !pageError && (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium text-sm">{t.schedules.noSchedulesYet}</p>
            <p className="text-gray-400 text-xs mt-1">{t.schedules.noSchedulesHint}</p>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                {editTarget ? t.schedules.editSchedule : t.schedules.newSchedule}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {formError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                  {formError}
                </div>
              )}

              {/* Group */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t.schedules.group}</label>
                <select
                  value={form.groupId}
                  onChange={(e) => setField("groupId", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  <option value="">{t.schedules.selectGroupPlaceholder}</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* Teacher */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t.schedules.teacher}</label>
                <select
                  value={form.teacherId}
                  onChange={(e) => setField("teacherId", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  <option value="">{t.schedules.selectTeacherPlaceholder}</option>
                  {activeTeachers.map((tch) => (
                    <option key={tch.id} value={tch.id}>{tch.fullName} — {tch.subject}</option>
                  ))}
                </select>
                {activeTeachers.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">{t.schedules.noActiveTeachers}</p>
                )}
              </div>

              {/* Day of week */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t.schedules.dayOfWeek}</label>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setField("dayOfWeek", String(d.value))}
                      className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                        form.dayOfWeek === String(d.value)
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {d.short}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start / End time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t.schedules.startTime}</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setField("startTime", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t.schedules.endTime}</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setField("endTime", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>
              {form.startTime && form.endTime && form.startTime >= form.endTime && (
                <p className="text-xs text-red-600 -mt-2">{t.schedules.endTimeAfterStart}</p>
              )}

              {/* Room */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t.schedules.room}</label>
                <input
                  type="text"
                  placeholder={t.schedules.roomPlaceholder}
                  value={form.room}
                  onChange={(e) => setField("room", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors"
              >
                {saving ? t.schedules.saving : editTarget ? t.schedules.update : t.schedules.create}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-2">{t.schedules.deleteSchedule}</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              {t.schedules.deleteScheduleConfirm}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg transition-colors"
              >
                {deleting ? t.schedules.deleting : t.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
