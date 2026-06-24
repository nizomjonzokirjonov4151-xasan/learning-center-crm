"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";

type NotificationType = "PAYMENT" | "ATTENDANCE" | "SALARY" | "GENERAL";
type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

const TYPE_STYLES: Record<NotificationType, string> = {
  PAYMENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ATTENDANCE: "bg-amber-50 text-amber-700 border-amber-200",
  SALARY: "bg-violet-50 text-violet-700 border-violet-200",
  GENERAL: "bg-gray-50 text-gray-700 border-gray-200",
};

export function NotificationsFeed({ accent = "indigo" }: { accent?: "indigo" | "emerald" }) {
  const { t, dateLocale } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.notifications)) setNotifications(data.notifications);
        else setError(data.error ?? "Failed to load");
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const buttonCls = accent === "emerald"
    ? "text-emerald-600 hover:underline"
    : "text-indigo-600 hover:underline";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <svg className="animate-spin h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 px-6 py-4 text-red-700 text-sm">{error}</div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">{t.notifications.title}</h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className={`text-sm font-medium ${buttonCls}`}>
            {t.notifications.markAllRead}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-16 text-gray-400">
          <svg className="w-10 h-10 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          <p className="text-sm">{t.notifications.empty}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`bg-white rounded-xl border shadow-sm p-4 flex items-start gap-3 ${n.isRead ? "border-gray-200" : "border-l-4 border-l-blue-500 border-gray-200"}`}
            >
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium flex-shrink-0 mt-0.5 ${TYPE_STYLES[n.type]}`}>
                {t.notifications[`type${n.type}` as "typePAYMENT" | "typeATTENDANCE" | "typeSALARY" | "typeGENERAL"]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                <p className="text-sm text-gray-600 mt-0.5">{n.body}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(n.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
