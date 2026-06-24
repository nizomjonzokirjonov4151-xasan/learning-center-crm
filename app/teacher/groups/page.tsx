import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/dal";
import { getServerTranslations } from "@/lib/i18n";

export default async function TeacherGroupsPage() {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");
  const { t, dateLocale } = await getServerTranslations();

  const groups = await prisma.group.findMany({
    where: { teacherId: session.teacherId ?? undefined },
    select: {
      id: true,
      name: true,
      description: true,
      monthlyFee: true,
      teacherPercent: true,
      _count: { select: { students: true } },
      schedules: { select: { dayOfWeek: true, startTime: true, endTime: true, room: true } },
    },
    orderBy: { name: "asc" },
  });

  const fmt = (n: number) => new Intl.NumberFormat(dateLocale).format(Math.round(n));

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:py-10 sm:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.teacherPortal.myGroupsTitle}</h1>
          <p className="mt-1 text-sm text-gray-500">{t.teacherPortal.myGroupsSubtitle}</p>
        </div>

        {groups.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="w-10 h-10 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25A2.25 2.25 0 0 0 4.5 16.5h15a2.25 2.25 0 0 0 2.25-2.25V8.25A2.25 2.25 0 0 0 19.5 6h-5.69a1.5 1.5 0 0 1-1.06-.44Z" />
            </svg>
            <p className="text-sm">{t.teacherPortal.noGroups}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map((g) => (
              <div key={g.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{g.name}</p>
                    {g.description && <p className="text-xs text-gray-400 mt-0.5">{g.description}</p>}
                  </div>
                  <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 flex-shrink-0">
                    {g.teacherPercent}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{t.teacherPortal.students}</span>
                  <span className="font-medium text-gray-900">{g._count.students}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{t.groups.monthlyFee}</span>
                  <span className="font-medium text-gray-900">{fmt(g.monthlyFee)} UZS</span>
                </div>
                {g.schedules.length > 0 && (
                  <div className="pt-2 border-t border-gray-100 space-y-1">
                    {g.schedules.map((s, i) => (
                      <p key={i} className="text-xs text-gray-500">
                        {s.startTime}–{s.endTime} · {s.room}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
