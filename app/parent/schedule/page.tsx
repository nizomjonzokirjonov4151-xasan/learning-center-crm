"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";

type ScheduleEntry = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
  group: { id: string; name: string };
  teacher: { id: string; fullName: string; subject: string };
};

export default function ParentSchedulePage() {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/parent/schedule")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSchedules(data);
        else setError(data.error ?? "Failed to load");
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const DAYS = [
    { key: 0, label: t.parentPortal.sunday },
    { key: 1, label: t.parentPortal.monday },
    { key: 2, label: t.parentPortal.tuesday },
    { key: 3, label: t.parentPortal.wednesday },
    { key: 4, label: t.parentPortal.thursday },
    { key: 5, label: t.parentPortal.friday },
    { key: 6, label: t.parentPortal.saturday },
  ];

  const todayDay = new Date().getDay();
  const scheduledDays = new Set(schedules.map((s) => s.dayOfWeek));
  const workDays = DAYS.filter((d) => scheduledDays.has(d.key));

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:py-10 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.parentPortal.schTitle}</h1>
          <p className="mt-1 text-sm text-gray-500">{t.parentPortal.schSubtitle}</p>
        </div>

        {error ? (
          <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">{error}</div>
        ) : loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <svg className="animate-spin h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">{t.common.loading}</span>
          </div>
        ) : schedules.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-16 text-center text-sm text-gray-400">
            {t.parentPortal.noSchedule}
          </div>
        ) : (
          <div className="space-y-4">
            {workDays.map(({ key, label }) => {
              const daySchedules = schedules.filter((s) => s.dayOfWeek === key)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
              return (
                <div key={key} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${key === todayDay ? "border-emerald-300 ring-1 ring-emerald-200" : "border-gray-200"}`}>
                  <div className={`px-5 py-3 border-b flex items-center gap-3 ${key === todayDay ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-100"}`}>
                    <span className={`text-sm font-semibold ${key === todayDay ? "text-emerald-700" : "text-gray-700"}`}>
                      {label}
                    </span>
                    {key === todayDay && (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Today
                      </span>
                    )}
                    <span className="ml-auto text-xs text-gray-400">{daySchedules.length} {daySchedules.length === 1 ? "class" : "classes"}</span>
                  </div>
                  <ul className="divide-y divide-gray-50">
                    {daySchedules.map((sc) => (
                      <li key={sc.id} className="px-5 py-4 flex items-center gap-4 flex-wrap sm:flex-nowrap">
                        <div className="w-20 flex-shrink-0">
                          <p className="text-sm font-semibold text-gray-900">{sc.startTime}</p>
                          <p className="text-xs text-gray-400">{sc.endTime}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{sc.group.name}</p>
                          <p className="text-xs text-gray-500">{sc.teacher.fullName} · {sc.teacher.subject}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 21V10.75m0 0 9-7.25m0 0 9 7.25" />
                          </svg>
                          {t.parentPortal.room}: {sc.room}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
