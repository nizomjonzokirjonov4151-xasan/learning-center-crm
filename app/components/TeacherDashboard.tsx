import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { SessionPayload } from "@/lib/session";
import { getServerTranslations } from "@/lib/i18n";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

const STATUS_STYLES: Record<string, string> = {
  PRESENT: "bg-emerald-50 text-emerald-700",
  ABSENT: "bg-red-50 text-red-700",
  LATE: "bg-amber-50 text-amber-700",
};

export default async function TeacherDashboard({ session }: { session: SessionPayload }) {
  const { t, dateLocale } = await getServerTranslations();

  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const teacherId = session.teacherId;

  const [myGroups, todayAttendance, mySchedules] = await Promise.all([
    safe(
      () =>
        prisma.group.findMany({
          where: teacherId ? { schedules: { some: { teacherId } } } : {},
          include: {
            _count: { select: { students: true } },
            schedules: {
              where: teacherId ? { teacherId } : {},
              select: { dayOfWeek: true, startTime: true, endTime: true, room: true },
            },
          },
          orderBy: { name: "asc" },
        }),
      []
    ),
    safe(
      () =>
        prisma.attendance.findMany({
          where: {
            date: todayUTC,
            ...(teacherId ? { group: { schedules: { some: { teacherId } } } } : {}),
          },
          select: { status: true, student: { select: { fullName: true } }, group: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
      []
    ),
    safe(
      () =>
        teacherId
          ? prisma.schedule.findMany({
              where: { teacherId },
              include: { group: { select: { name: true } } },
              orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
            })
          : Promise.resolve([]),
      []
    ),
  ]);

  const totalStudents = myGroups.reduce((sum, g) => sum + g._count.students, 0);
  const presentToday = todayAttendance.filter((a) => a.status === "PRESENT").length;
  const absentToday = todayAttendance.filter((a) => a.status === "ABSENT").length;
  const lateToday = todayAttendance.filter((a) => a.status === "LATE").length;
  const attendancePct =
    todayAttendance.length > 0 ? Math.round((presentToday / todayAttendance.length) * 100) : null;

  // dayOfWeek: 1=Mon...7=Sun. Jan 1 2024 was a Monday.
  const getDayName = (day: number) =>
    new Date(2024, 0, day).toLocaleDateString(dateLocale, { weekday: "short" });

  const STATUS_LABELS: Record<string, string> = {
    PRESENT: t.attendance.present,
    ABSENT: t.attendance.absent,
    LATE: t.attendance.late,
  };

  const JS_DAY_TO_SCHEMA = [7, 1, 2, 3, 4, 5, 6];
  const todaySchemaDay = JS_DAY_TO_SCHEMA[now.getDay()];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t.dashboard.welcomeBack}, {session.fullName}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {now.toLocaleDateString(dateLocale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200">
            {t.dashboard.teacher}
          </span>
        </div>

        {/* KPI cards */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">{t.teacherDashboard.overview}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 border-l-4 border-l-blue-500 p-5 flex items-start gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25A2.25 2.25 0 0 0 4.5 16.5h15a2.25 2.25 0 0 0 2.25-2.25V8.25A2.25 2.25 0 0 0 19.5 6h-5.69a1.5 1.5 0 0 1-1.06-.44Z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-none">{t.teacherDashboard.myGroups}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1.5 leading-none">{myGroups.length}</p>
                <p className="text-xs text-gray-400 mt-1.5">{t.teacherDashboard.assignedGroups}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 border-l-4 border-l-emerald-500 p-5 flex items-start gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-none">{t.teacherDashboard.myStudents}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1.5 leading-none">{totalStudents}</p>
                <p className="text-xs text-gray-400 mt-1.5">{t.teacherDashboard.acrossAllGroups}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 border-l-4 border-l-amber-500 p-5 flex items-start gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-none">{t.teacherDashboard.todaysAttendance}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1.5 leading-none">
                  {attendancePct !== null ? `${attendancePct}%` : "—"}
                </p>
                <p className="text-xs text-gray-400 mt-1.5">
                  {todayAttendance.length > 0
                    ? `${presentToday} ${t.dashboard.present} · ${absentToday} ${t.dashboard.absent} · ${lateToday} ${t.dashboard.late}`
                    : t.teacherDashboard.notRecordedYet}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Groups */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{t.teacherDashboard.myGroupsList}</h2>
              <Link href="/groups" className="text-xs text-blue-600 hover:underline font-medium">{t.teacherDashboard.viewAll}</Link>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {myGroups.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-gray-400">
                  {t.teacherDashboard.noGroupsAssigned}
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {myGroups.map((g) => {
                    const todaySchedules = g.schedules.filter((s) => s.dayOfWeek === todaySchemaDay);
                    return (
                      <li key={g.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{g.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {g._count.students} {t.teacherDashboard.students}
                            </p>
                          </div>
                          {todaySchedules.length > 0 ? (
                            <div className="text-right flex-shrink-0">
                              {todaySchedules.map((s, i) => (
                                <p key={i} className="text-xs font-medium text-blue-600">
                                  {s.startTime}–{s.endTime}
                                </p>
                              ))}
                              <p className="text-xs text-gray-400">{todaySchedules[0]?.room}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300 flex-shrink-0">{t.teacherDashboard.noClassToday}</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Today's Attendance */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{t.teacherDashboard.todaysAttendanceSection}</h2>
              <Link href="/attendance" className="text-xs text-blue-600 hover:underline font-medium">{t.teacherDashboard.recordLink}</Link>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {todayAttendance.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-gray-400">
                  {t.teacherDashboard.noAttendanceToday}
                  <div className="mt-3">
                    <Link href="/attendance" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline">
                      {t.teacherDashboard.recordNow}
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                  {todayAttendance.map((a, i) => (
                    <li key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0 uppercase">
                        {a.student.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{a.student.fullName}</p>
                        <p className="text-xs text-gray-400 truncate">{a.group.name}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_STYLES[a.status]}`}>
                        {STATUS_LABELS[a.status] ?? (a.status.charAt(0) + a.status.slice(1).toLowerCase())}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        {/* My Schedule */}
        {mySchedules.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">{t.teacherDashboard.mySchedule}</h2>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {[t.teacherDashboard.day, t.teacherDashboard.group, t.teacherDashboard.time, t.teacherDashboard.room].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {mySchedules.map((s) => (
                      <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${s.dayOfWeek === todaySchemaDay ? "bg-blue-50/40" : ""}`}>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${s.dayOfWeek === todaySchemaDay ? "text-blue-600" : "text-gray-700"}`}>
                            {getDayName(s.dayOfWeek)}
                            {s.dayOfWeek === todaySchemaDay && (
                              <span className="ml-1.5 text-xs font-normal text-blue-500">({t.teacherDashboard.today})</span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{s.group.name}</td>
                        <td className="px-4 py-3 text-gray-600">{s.startTime}–{s.endTime}</td>
                        <td className="px-4 py-3 text-gray-500">{s.room}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">{t.teacherDashboard.quickActions}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/attendance"
              className="flex items-center gap-3 px-4 py-4 rounded-2xl border border-amber-200 font-semibold text-sm text-amber-600 bg-amber-50 hover:bg-amber-100 transition-all shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              {t.teacherDashboard.recordAttendance}
            </Link>
            <Link
              href="/groups"
              className="flex items-center gap-3 px-4 py-4 rounded-2xl border border-blue-200 font-semibold text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25A2.25 2.25 0 0 0 4.5 16.5h15a2.25 2.25 0 0 0 2.25-2.25V8.25A2.25 2.25 0 0 0 19.5 6h-5.69a1.5 1.5 0 0 1-1.06-.44Z" />
              </svg>
              {t.teacherDashboard.viewMyGroups}
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
