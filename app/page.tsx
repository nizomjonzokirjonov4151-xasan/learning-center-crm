import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/dal";
import Link from "next/link";
import { DashboardCharts, type MonthStudentPoint, type MonthRevenuePoint, type AttendancePoint } from "@/app/components/DashboardCharts";
import TeacherDashboard from "@/app/components/TeacherDashboard";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  MANAGER: "Manager",
  TEACHER: "Teacher",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-violet-100 text-violet-700 border-violet-200",
  MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
  TEACHER: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const STATUS_STYLES: Record<string, string> = {
  PRESENT: "bg-emerald-50 text-emerald-700",
  ABSENT: "bg-red-50 text-red-700",
  LATE: "bg-amber-50 text-amber-700",
};

function dateKey(d: Date) {
  return d.toISOString().split("T")[0];
}

export default async function DashboardPage() {
  const session = await getSession();

  if (session?.role === "TEACHER") {
    return <TeacherDashboard session={session} />;
  }

  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const JS_DAY_TO_SCHEMA = [7, 1, 2, 3, 4, 5, 6];
  const todaySchemaDay = JS_DAY_TO_SCHEMA[now.getDay()];

  // ── Date ranges ──────────────────────────────────────────────────────────
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const sevenDaysAgo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6)
  );

  const noAgg = { _sum: { amount: null } };

  // ── All queries in parallel ──────────────────────────────────────────────
  const [
    studentCount,
    activeStudentCount,
    groupCount,
    activeGroupCount,
    teacherCount,
    activeTeacherCount,
    presentToday,
    absentToday,
    lateToday,
    revenueMonthAgg,
    paymentsThisMonthCount,
    totalSchedules,
    todayClassCount,
    totalRooms,
    activeRooms,
    // Charts raw data
    studentsLast6Months,
    paymentsLast6Months,
    attendanceLast7Days,
    // Recent activity
    recentStudents,
    recentPayments,
    recentAttendance,
  ] = await Promise.all([
    safe(() => prisma.student.count(), 0),
    safe(() => prisma.student.count({ where: { groupId: { not: null } } }), 0),
    safe(() => prisma.group.count(), 0),
    safe(() => prisma.group.count({ where: { students: { some: {} } } }), 0),
    safe(() => prisma.teacher.count(), 0),
    safe(() => prisma.teacher.count({ where: { isActive: true } }), 0),
    safe(() => prisma.attendance.count({ where: { date: todayUTC, status: "PRESENT" } }), 0),
    safe(() => prisma.attendance.count({ where: { date: todayUTC, status: "ABSENT" } }), 0),
    safe(() => prisma.attendance.count({ where: { date: todayUTC, status: "LATE" } }), 0),
    safe(
      () =>
        prisma.payment.aggregate({
          where: { month: currentMonth, year: currentYear },
          _sum: { amount: true },
        }),
      noAgg
    ),
    safe(
      () => prisma.payment.count({ where: { month: currentMonth, year: currentYear } }),
      0
    ),
    safe(() => prisma.schedule.count(), 0),
    safe(() => prisma.schedule.count({ where: { dayOfWeek: todaySchemaDay } }), 0),
    safe(() => prisma.room.count(), 0),
    safe(() => prisma.room.count({ where: { isActive: true } }), 0),
    // Chart data
    safe(
      () =>
        prisma.student.findMany({
          where: { createdAt: { gte: sixMonthsAgo } },
          select: { createdAt: true },
        }),
      []
    ),
    safe(
      () =>
        prisma.payment.findMany({
          where: {
            OR: Array.from({ length: 6 }, (_, i) => {
              const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
              return { month: d.getMonth() + 1, year: d.getFullYear() };
            }),
          },
          select: { amount: true, month: true, year: true },
        }),
      []
    ),
    safe(
      () =>
        prisma.attendance.findMany({
          where: { date: { gte: sevenDaysAgo } },
          select: { date: true, status: true },
        }),
      []
    ),
    // Recent students
    safe(
      () =>
        prisma.student.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            fullName: true,
            phone: true,
            createdAt: true,
            group: { select: { name: true } },
          },
        }),
      []
    ),
    // Recent payments
    safe(
      () =>
        prisma.payment.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            amount: true,
            month: true,
            year: true,
            paymentDate: true,
            student: { select: { fullName: true } },
          },
        }),
      []
    ),
    // Recent attendance
    safe(
      () =>
        prisma.attendance.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            date: true,
            status: true,
            student: { select: { fullName: true } },
            group: { select: { name: true } },
          },
        }),
      []
    ),
  ]);

  // ── Derived KPI values ───────────────────────────────────────────────────
  const monthRevenue = revenueMonthAgg._sum.amount ?? 0;
  const attendanceToday = presentToday + absentToday + lateToday;
  const attendancePct =
    attendanceToday > 0 ? Math.round((presentToday / attendanceToday) * 100) : 0;

  // ── Build chart data ─────────────────────────────────────────────────────
  const months: { label: string; month: number; year: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    });
  }

  const studentGrowth: MonthStudentPoint[] = months.map((m) => ({
    month: m.label,
    students: studentsLast6Months.filter((s) => {
      const d = new Date(s.createdAt);
      return d.getMonth() + 1 === m.month && d.getFullYear() === m.year;
    }).length,
  }));

  const revenueByMonth: MonthRevenuePoint[] = months.map((m) => ({
    month: m.label,
    revenue: paymentsLast6Months
      .filter((p) => p.month === m.month && p.year === m.year)
      .reduce((sum, p) => sum + p.amount, 0),
  }));

  const attendanceTrend: AttendancePoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i)
    );
    const key = dateKey(d);
    const dayRecs = attendanceLast7Days.filter((a) => dateKey(new Date(a.date)) === key);
    attendanceTrend.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      present: dayRecs.filter((a) => a.status === "PRESENT").length,
      absent: dayRecs.filter((a) => a.status === "ABSENT").length,
      late: dayRecs.filter((a) => a.status === "LATE").length,
    });
  }

  // ── KPI card definitions ─────────────────────────────────────────────────
  const kpiCards = [
    {
      label: "Total Students",
      value: studentCount,
      sub: `${activeStudentCount} in a group`,
      icon: (
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
      ),
      iconBg: "bg-blue-50",
      href: "/students",
      accent: "border-l-blue-500",
    },
    {
      label: "Total Groups",
      value: groupCount,
      sub: `${activeGroupCount} active`,
      icon: (
        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25A2.25 2.25 0 0 0 4.5 16.5h15a2.25 2.25 0 0 0 2.25-2.25V8.25A2.25 2.25 0 0 0 19.5 6h-5.69a1.5 1.5 0 0 1-1.06-.44Z" />
        </svg>
      ),
      iconBg: "bg-emerald-50",
      href: "/groups",
      accent: "border-l-emerald-500",
    },
    {
      label: "Total Teachers",
      value: teacherCount,
      sub: `${activeTeacherCount} active`,
      icon: (
        <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
        </svg>
      ),
      iconBg: "bg-violet-50",
      href: "/teachers",
      accent: "border-l-violet-500",
    },
    {
      label: "Today's Classes",
      value: todayClassCount,
      sub: `${totalSchedules} total schedules`,
      icon: (
        <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      iconBg: "bg-sky-50",
      href: "/schedules",
      accent: "border-l-sky-500",
    },
    {
      label: "Revenue This Month",
      value: `${fmt(monthRevenue)} UZS`,
      sub: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      icon: (
        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      iconBg: "bg-green-50",
      href: "/payments",
      accent: "border-l-green-500",
    },
    {
      label: "Payments This Month",
      value: paymentsThisMonthCount,
      sub: "Payment records",
      icon: (
        <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
        </svg>
      ),
      iconBg: "bg-teal-50",
      href: "/payments",
      accent: "border-l-teal-500",
    },
    {
      label: "Today's Attendance",
      value: attendanceToday > 0 ? `${attendancePct}%` : "—",
      sub:
        attendanceToday > 0
          ? `${presentToday} present · ${absentToday} absent · ${lateToday} late`
          : "Not recorded yet",
      icon: (
        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      iconBg: "bg-amber-50",
      href: "/attendance",
      accent: "border-l-amber-500",
    },
    {
      label: "Active Students",
      value: activeStudentCount,
      sub: `${studentCount - activeStudentCount} unassigned`,
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
        </svg>
      ),
      iconBg: "bg-indigo-50",
      href: "/students",
      accent: "border-l-indigo-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {session?.fullName ?? "User"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {now.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {session && (
              <span
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${ROLE_COLORS[session.role]}`}
              >
                {ROLE_LABELS[session.role]}
              </span>
            )}
          </div>
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map(({ label, value, sub, icon, iconBg, href, accent }) => (
              <Link
                key={label + href}
                href={href}
                className={`bg-white rounded-2xl border border-gray-200 border-l-4 ${accent} p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-all group`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}
                >
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-none">
                    {label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1.5 leading-none">
                    {value}
                  </p>
                  <p className="text-xs text-gray-400 mt-1.5 leading-tight">{sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Rooms ─────────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Rooms</h2>
            <Link href="/rooms" className="text-xs text-blue-600 hover:underline font-medium">Manage rooms →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/rooms" className="bg-white rounded-2xl border border-gray-200 border-l-4 border-l-blue-500 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 21V10.75m0 0 9-7.25m0 0 9 7.25" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-none">Total Rooms</p>
                <p className="text-2xl font-bold text-gray-900 mt-1.5 leading-none">{totalRooms}</p>
                <p className="text-xs text-gray-400 mt-1.5">{activeRooms} active</p>
              </div>
            </Link>
            <Link href="/rooms?filter=active" className="bg-white rounded-2xl border border-gray-200 border-l-4 border-l-emerald-500 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-none">Active Rooms</p>
                <p className="text-2xl font-bold text-gray-900 mt-1.5 leading-none">{activeRooms}</p>
                <p className="text-xs text-gray-400 mt-1.5">{totalRooms - activeRooms} inactive</p>
              </div>
            </Link>
          </div>
        </section>

        {/* ── Charts ────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Analytics
          </h2>
          <DashboardCharts
            studentGrowth={studentGrowth}
            revenueByMonth={revenueByMonth}
            attendanceTrend={attendanceTrend}
          />
        </section>

        {/* ── Recent Activity ───────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Recent Activity
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Recent Students */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Latest Students</h3>
                <Link href="/students" className="text-xs text-blue-600 hover:underline font-medium">
                  View all
                </Link>
              </div>
              {recentStudents.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  No students yet
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {recentStudents.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0 uppercase">
                        {s.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{s.fullName}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {s.group?.name ?? "No group"} · {s.phone}
                        </p>
                      </div>
                      <time className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recent Payments */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Latest Payments</h3>
                <Link href="/payments" className="text-xs text-blue-600 hover:underline font-medium">
                  View all
                </Link>
              </div>
              {recentPayments.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  No payments yet
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {recentPayments.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.student.fullName}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(0, p.month - 1).toLocaleString("en-US", { month: "long" })} {p.year}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-700 flex-shrink-0">
                        {fmt(p.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recent Attendance */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Latest Attendance</h3>
                <Link href="/attendance" className="text-xs text-blue-600 hover:underline font-medium">
                  View all
                </Link>
              </div>
              {recentAttendance.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  No attendance records yet
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {recentAttendance.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0 uppercase">
                        {a.student.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{a.student.fullName}</p>
                        <p className="text-xs text-gray-400 truncate">{a.group.name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[a.status]}`}>
                          {a.status.charAt(0) + a.status.slice(1).toLowerCase()}
                        </span>
                        <time className="text-xs text-gray-400">
                          {new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </time>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                href: "/students",
                label: "Add Student",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.765Z" />
                  </svg>
                ),
                color: "text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200",
              },
              {
                href: "/groups",
                label: "Add Group",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                  </svg>
                ),
                color: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
              },
              {
                href: "/payments",
                label: "Add Payment",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                ),
                color: "text-teal-600 bg-teal-50 hover:bg-teal-100 border-teal-200",
              },
              {
                href: "/teachers",
                label: "Add Teacher",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                  </svg>
                ),
                color: "text-violet-600 bg-violet-50 hover:bg-violet-100 border-violet-200",
              },
            ].map(({ href, label, icon, color }) => (
              <Link
                key={href + label}
                href={href}
                className={`flex items-center gap-3 px-4 py-4 rounded-2xl border font-semibold text-sm transition-all shadow-sm hover:shadow-md ${color}`}
              >
                {icon}
                {label}
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
