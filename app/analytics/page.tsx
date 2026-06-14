"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

type StudentData = {
  total: number;
  active: number;
  totalTeachers: number;
  totalGroups: number;
  monthlyGrowth: { month: string; count: number }[];
};

type RevenueData = {
  monthlyRevenue: { month: string; revenue: number }[];
  totalRevenue: number;
  thisMonthRevenue: number;
  paymentCount: number;
};

type AttendanceData = {
  present: number;
  absent: number;
  late: number;
  total: number;
  presentPct: number;
  absentPct: number;
  latePct: number;
  trend: { date: string; present: number; absent: number; late: number }[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(Math.round(n));
}

function fmtFull(n: number, locale = "en-US") {
  return new Intl.NumberFormat(locale).format(Math.round(n));
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} />;
}

// ── Chart card wrapper ────────────────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  children,
  loading,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="mb-5">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {loading ? <Skeleton className="h-56 w-full" /> : children}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-56 flex flex-col items-center justify-center gap-2 text-gray-300">
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── Tooltip styles ────────────────────────────────────────────────────────────

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  fontSize: 12,
};

// ── Donut label ───────────────────────────────────────────────────────────────

function DonutLabel({
  cx, cy, label, value,
}: {
  cx: number; cy: number; label: string; value: number;
}) {
  return (
    <>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#111827" fontSize={28} fontWeight={700}>
        {value}%
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#6b7280" fontSize={11}>
        {label}
      </text>
    </>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon, accent, loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
  loading: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 border-l-4 ${accent} p-5 shadow-sm`}>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
          {loading ? (
            <Skeleton className="h-7 w-16 mt-1.5" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 mt-1 leading-none">{value}</p>
          )}
          {sub && !loading && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { t, dateLocale } = useTranslation();
  const [students, setStudents] = useState<StudentData | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = !students || !revenue || !attendance;

  useEffect(() => {
    async function load() {
      try {
        const [sRes, rRes, aRes] = await Promise.all([
          fetch("/api/analytics/students"),
          fetch("/api/analytics/revenue"),
          fetch("/api/analytics/attendance"),
        ]);

        if (!sRes.ok || !rRes.ok || !aRes.ok) {
          throw new Error("One or more analytics endpoints failed.");
        }

        const [s, r, a] = await Promise.all([sRes.json(), rRes.json(), aRes.json()]);
        setStudents(s);
        setRevenue(r);
        setAttendance(a);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load analytics.");
      }
    }
    load();
  }, []);

  const hasStudentGrowth = students?.monthlyGrowth.some((d) => d.count > 0) ?? false;
  const hasRevenue = revenue?.monthlyRevenue.some((d) => d.revenue > 0) ?? false;
  const hasAttendance = (attendance?.total ?? 0) > 0;
  const hasAttendanceTrend = attendance?.trend.some(
    (d) => d.present + d.absent + d.late > 0
  ) ?? false;

  const donutData = attendance
    ? [
        { name: "Present", value: attendance.presentPct, color: "#10b981" },
        { name: "Absent", value: attendance.absentPct, color: "#ef4444" },
        { name: "Late", value: attendance.latePct, color: "#f59e0b" },
      ]
    : [];

  const now = new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t.analytics.title}</h1>
            <p className="mt-1 text-sm text-gray-500">{t.analytics.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            {now.toLocaleDateString(dateLocale, { month: "long", year: "numeric" })}
          </div>
        </div>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <span>{error}</span>
            <button
              className="ml-auto text-xs font-semibold underline hover:no-underline"
              onClick={() => window.location.reload()}
            >
              {t.common.retry}
            </button>
          </div>
        )}

        {/* ── KPI Cards ───────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            {t.analytics.overview}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard
              label={t.analytics.totalStudents}
              value={students?.total ?? 0}
              sub={`${students?.active ?? 0} ${t.analytics.inAGroup}`}
              loading={loading}
              accent="border-l-blue-500"
              icon={
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              }
            />
            <KpiCard
              label={t.analytics.activeStudents}
              value={students?.active ?? 0}
              sub={t.analytics.enrolledInGroup}
              loading={loading}
              accent="border-l-indigo-500"
              icon={
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              }
            />
            <KpiCard
              label={t.analytics.totalTeachers}
              value={students?.totalTeachers ?? 0}
              sub={t.analytics.instructors}
              loading={loading}
              accent="border-l-violet-500"
              icon={
                <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
                </svg>
              }
            />
            <KpiCard
              label={t.analytics.totalGroups}
              value={students?.totalGroups ?? 0}
              sub={t.analytics.classGroups}
              loading={loading}
              accent="border-l-emerald-500"
              icon={
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25A2.25 2.25 0 0 0 4.5 16.5h15a2.25 2.25 0 0 0 2.25-2.25V8.25A2.25 2.25 0 0 0 19.5 6h-5.69a1.5 1.5 0 0 1-1.06-.44Z" />
                </svg>
              }
            />
            <KpiCard
              label={t.analytics.monthlyRevenue}
              value={revenue ? `${fmt(revenue.thisMonthRevenue)} UZS` : "—"}
              sub={revenue ? `${fmtFull(revenue.totalRevenue, dateLocale)} UZS ${t.analytics.totalRevenue}` : undefined}
              loading={loading}
              accent="border-l-green-500"
              icon={
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              }
            />
          </div>
        </section>

        {/* ── Growth + Revenue Charts ──────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Growth &amp; Revenue
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Student Growth */}
            <ChartCard
              title="Student Registrations"
              subtitle="New students per month — last 6 months"
              loading={loading}
            >
              {hasStudentGrowth ? (
                <ResponsiveContainer width="100%" height={224}>
                  <BarChart
                    data={students!.monthlyGrowth}
                    margin={{ top: 4, right: 8, bottom: 0, left: -24 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: "#f8fafc" }}
                      contentStyle={tooltipStyle}
                      formatter={(v) => [String(v), "New Students"]}
                    />
                    <Bar dataKey="count" name="Students" fill="#3b82f6" radius={[5, 5, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No student registrations yet" />
              )}
            </ChartCard>

            {/* Revenue */}
            <ChartCard
              title="Revenue (UZS)"
              subtitle="Total payments collected per month — last 6 months"
              loading={loading}
            >
              {hasRevenue ? (
                <ResponsiveContainer width="100%" height={224}>
                  <BarChart
                    data={revenue!.monthlyRevenue}
                    margin={{ top: 4, right: 8, bottom: 0, left: -8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => fmt(Number(v))}
                    />
                    <Tooltip
                      cursor={{ fill: "#f8fafc" }}
                      contentStyle={tooltipStyle}
                      formatter={(v) => [`${fmtFull(Number(v))} UZS`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No revenue data yet" />
              )}
            </ChartCard>
          </div>
        </section>

        {/* ── Attendance Section ───────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Attendance
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Donut + Stats */}
            <ChartCard
              title="Attendance Breakdown"
              subtitle="All-time distribution across all records"
              loading={loading}
            >
              {hasAttendance ? (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Donut */}
                  <div className="flex-shrink-0">
                    <PieChart width={200} height={200}>
                      <Pie
                        data={donutData}
                        cx={100}
                        cy={100}
                        innerRadius={62}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                      >
                        {donutData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <DonutLabel
                        cx={100}
                        cy={100}
                        label="Present"
                        value={attendance!.presentPct}
                      />
                    </PieChart>
                  </div>

                  {/* Legend + breakdown */}
                  <div className="flex-1 space-y-4 w-full">
                    {[
                      { label: "Present", pct: attendance!.presentPct, count: attendance!.present, color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
                      { label: "Absent", pct: attendance!.absentPct, count: attendance!.absent, color: "bg-red-500", text: "text-red-700", bg: "bg-red-50" },
                      { label: "Late", pct: attendance!.latePct, count: attendance!.late, color: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
                    ].map(({ label, pct, count, color, text, bg }) => (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
                            <span className="text-sm font-medium text-gray-700">{label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${bg} ${text}`}>
                              {count.toLocaleString()} records
                            </span>
                            <span className="text-sm font-bold text-gray-900 w-10 text-right">
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${color}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-gray-400 pt-1">
                      {attendance!.total.toLocaleString()} total records
                    </p>
                  </div>
                </div>
              ) : (
                <EmptyChart message="No attendance records yet" />
              )}
            </ChartCard>

            {/* 30-day Trend */}
            <ChartCard
              title="Attendance Trend"
              subtitle="Daily counts — last 30 days"
              loading={loading}
            >
              {hasAttendanceTrend ? (
                <ResponsiveContainer width="100%" height={224}>
                  <AreaChart
                    data={attendance!.trend}
                    margin={{ top: 4, right: 8, bottom: 0, left: -24 }}
                  >
                    <defs>
                      <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradAbsent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradLate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      interval={6}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Area
                      type="monotone"
                      dataKey="present"
                      name="Present"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#gradPresent)"
                      dot={false}
                      activeDot={{ r: 4, fill: "#10b981" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="absent"
                      name="Absent"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fill="url(#gradAbsent)"
                      dot={false}
                      activeDot={{ r: 4, fill: "#ef4444" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="late"
                      name="Late"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fill="url(#gradLate)"
                      dot={false}
                      activeDot={{ r: 4, fill: "#f59e0b" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No attendance trend data yet" />
              )}
            </ChartCard>
          </div>
        </section>

        {/* ── Revenue summary row ──────────────────────────────────────────── */}
        {!loading && revenue && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
              {t.analytics.revenueBreakdown}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  label: t.analytics.totalRevenue,
                  value: `${fmtFull(revenue.totalRevenue, dateLocale)} UZS`,
                  sub: `${revenue.paymentCount} ${t.dashboard.paymentRecords}`,
                  icon: "💰",
                  bg: "bg-green-50",
                  border: "border-green-200",
                  text: "text-green-900",
                },
                {
                  label: t.analytics.monthlyRevenue,
                  value: `${fmtFull(revenue.thisMonthRevenue, dateLocale)} UZS`,
                  sub: now.toLocaleDateString(dateLocale, { month: "long", year: "numeric" }),
                  icon: "📅",
                  bg: "bg-blue-50",
                  border: "border-blue-200",
                  text: "text-blue-900",
                },
                {
                  label: "Avg per Month",
                  value: `${fmtFull(revenue.monthlyRevenue.reduce((s, m) => s + m.revenue, 0) / Math.max(1, revenue.monthlyRevenue.filter((m) => m.revenue > 0).length))} UZS`,
                  sub: "Over last 6 months",
                  icon: "📊",
                  bg: "bg-violet-50",
                  border: "border-violet-200",
                  text: "text-violet-900",
                },
              ].map(({ label, value, sub, icon, bg, border, text }) => (
                <div
                  key={label}
                  className={`rounded-2xl border ${bg} ${border} p-5 shadow-sm`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                      <p className={`text-lg font-bold mt-1 leading-tight ${text}`}>{value}</p>
                      <p className="text-xs text-gray-400 mt-1">{sub}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
