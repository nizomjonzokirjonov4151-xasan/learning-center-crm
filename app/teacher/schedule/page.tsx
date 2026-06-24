import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/dal";
import { getServerTranslations } from "@/lib/i18n";

export default async function TeacherSchedulePage() {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");
  const { t, dateLocale } = await getServerTranslations();

  const schedules = await prisma.schedule.findMany({
    where: { teacherId: session.teacherId ?? undefined },
    include: { group: { select: { name: true } } },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  const now = new Date();
  const JS_DAY_TO_SCHEMA = [7, 1, 2, 3, 4, 5, 6];
  const todaySchemaDay = JS_DAY_TO_SCHEMA[now.getDay()];
  const getDayName = (day: number) => new Date(2024, 0, day).toLocaleDateString(dateLocale, { weekday: "long" });

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:py-10 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.teacherPortal.myScheduleTitle}</h1>
          <p className="mt-1 text-sm text-gray-500">{t.teacherPortal.myScheduleSubtitle}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg className="w-10 h-10 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="text-sm">{t.teacherPortal.noSchedule}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {[t.teacherDashboard.day, t.teacherDashboard.group, t.teacherDashboard.time, t.teacherDashboard.room].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {schedules.map((s) => (
                  <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${s.dayOfWeek === todaySchemaDay ? "bg-indigo-50/40" : ""}`}>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${s.dayOfWeek === todaySchemaDay ? "text-indigo-600" : "text-gray-700"}`}>
                        {getDayName(s.dayOfWeek)}
                        {s.dayOfWeek === todaySchemaDay && (
                          <span className="ml-1.5 text-xs font-normal text-indigo-500">({t.teacherDashboard.today})</span>
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
          )}
        </div>
      </div>
    </div>
  );
}
