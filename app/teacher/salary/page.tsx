import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/dal";
import { getServerTranslations } from "@/lib/i18n";

export default async function TeacherSalaryPage() {
  const session = await getSession();
  if (!session || session.role !== "TEACHER" || !session.teacherId) redirect("/login");
  const { t, dateLocale } = await getServerTranslations();
  const fmt = (n: number) => new Intl.NumberFormat(dateLocale).format(Math.round(n));

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const teacher = await prisma.teacher.findUnique({
    where: { id: session.teacherId! },
    select: { salaryType: true, salaryValue: true },
  });

  const groups = await prisma.group.findMany({
    where: { teacherId: session.teacherId! },
    select: {
      id: true,
      name: true,
      teacherPercent: true,
      _count: { select: { students: true } },
      students: {
        select: { payments: { where: { month: currentMonth, year: currentYear }, select: { amount: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const breakdown = groups.map((g) => {
    const revenue = g.students.reduce((s, st) => s + st.payments.reduce((ps, p) => ps + p.amount, 0), 0);
    const earnedSalary = revenue * (g.teacherPercent / 100);
    return { id: g.id, name: g.name, studentCount: g._count.students, teacherPercent: g.teacherPercent, revenue, earnedSalary };
  });
  const totalRevenue = breakdown.reduce((s, g) => s + g.revenue, 0);
  const totalCommission = breakdown.reduce((s, g) => s + g.earnedSalary, 0);

  const isFixed = teacher?.salaryType === "FIXED";

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:py-10 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.teacherPortal.mySalaryTitle}</h1>
          <p className="mt-1 text-sm text-gray-500">{t.teacherPortal.mySalarySubtitle}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.teachers.salaryType}</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {isFixed ? t.teachers.salaryTypeFixed : t.teachers.salaryTypePercentage}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {isFixed ? t.teacherPortal.monthlySalary : t.teacherPortal.commissionRateLabel}
              </p>
              <p className="text-2xl font-bold text-indigo-700 mt-1">
                {isFixed
                  ? `${fmt(teacher?.salaryValue ?? 0)} UZS`
                  : `${teacher?.salaryValue ?? 0}%`}
              </p>
            </div>
          </div>
        </div>

        {!isFixed && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 border-l-4 border-l-violet-500 p-5 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.teacherDashboard.revenueThisMonth}</p>
                <p className="text-xl font-bold text-gray-900 mt-1.5">{fmt(totalRevenue)} UZS</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 border-l-4 border-l-green-500 p-5 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.teacherDashboard.expectedSalary}</p>
                <p className="text-xl font-bold text-green-700 mt-1.5">{fmt(totalCommission)} UZS</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">{t.teacherDashboard.groupBreakdown}</h3>
              </div>
              {breakdown.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">{t.teacherDashboard.noRevenue}</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {[t.teacherDashboard.group, t.common.students, t.teacherDashboard.commissionRate, t.teacherDashboard.revenue, t.teacherDashboard.earnedSalary].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {breakdown.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                        <td className="px-4 py-3 text-gray-600">{row.studentCount}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-violet-50 border border-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                            {row.teacherPercent}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-medium">{fmt(row.revenue)} UZS</td>
                        <td className="px-4 py-3 text-green-700 font-semibold">{fmt(row.earnedSalary)} UZS</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
