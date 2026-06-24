import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { SessionPayload } from "@/lib/session";
import { getServerTranslations } from "@/lib/i18n";
import { getDebtors } from "@/lib/debtors";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export default async function FinanceDashboard({ session }: { session: SessionPayload }) {
  const { t, dateLocale } = await getServerTranslations();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const fmt = (n: number) => new Intl.NumberFormat(dateLocale).format(Math.round(n));

  const [
    monthRevenueAgg,
    paymentsThisMonthCount,
    debtors,
    recentPayments,
    activeTeachers,
  ] = await Promise.all([
    safe(
      () => prisma.payment.aggregate({ where: { month: currentMonth, year: currentYear }, _sum: { amount: true } }),
      { _sum: { amount: null } }
    ),
    safe(() => prisma.payment.count({ where: { month: currentMonth, year: currentYear } }), 0),
    safe(() => getDebtors(), []),
    safe(
      () =>
        prisma.payment.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true, amount: true, month: true, year: true, paymentDate: true,
            student: { select: { fullName: true } },
          },
        }),
      []
    ),
    safe(
      () =>
        prisma.teacher.findMany({
          where: { isActive: true },
          select: {
            id: true, fullName: true, salaryType: true, salaryValue: true,
            groups: {
              select: {
                teacherPercent: true,
                students: { select: { payments: { where: { month: currentMonth, year: currentYear }, select: { amount: true } } } },
              },
            },
          },
        }),
      []
    ),
  ]);

  const monthRevenue = monthRevenueAgg._sum.amount ?? 0;
  const totalOutstanding = debtors.reduce((s, d) => s + d.remainingDebt, 0);

  const payroll = activeTeachers.map((teacher) => {
    if (teacher.salaryType === "FIXED") {
      return { id: teacher.id, fullName: teacher.fullName, amount: teacher.salaryValue ?? 0, type: "FIXED" as const };
    }
    const earned = teacher.groups.reduce((sum, g) => {
      const revenue = g.students.reduce((s, st) => s + st.payments.reduce((ps, p) => ps + p.amount, 0), 0);
      return sum + revenue * (g.teacherPercent / 100);
    }, 0);
    return { id: teacher.id, fullName: teacher.fullName, amount: earned, type: "PERCENTAGE" as const };
  });
  const totalPayroll = payroll.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-8">

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t.dashboard.welcomeBack}, {session.fullName}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {now.toLocaleDateString(dateLocale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200">
            {t.dashboard.accountant}
          </span>
        </div>

        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">{t.financeDashboard.overview}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 border-l-4 border-l-green-500 p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.financeDashboard.revenueThisMonth}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1.5">{fmt(monthRevenue)} UZS</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 border-l-4 border-l-teal-500 p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.financeDashboard.paymentsThisMonth}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1.5">{paymentsThisMonthCount}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 border-l-4 border-l-red-500 p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.financeDashboard.outstandingDebt}</p>
              <p className="text-2xl font-bold text-red-600 mt-1.5">{fmt(totalOutstanding)} UZS</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 border-l-4 border-l-violet-500 p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.financeDashboard.payrollThisMonth}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1.5">{fmt(totalPayroll)} UZS</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{t.financeDashboard.recentPayments}</h2>
              <Link href="/payments" className="text-xs text-blue-600 hover:underline font-medium">{t.common.viewAll}</Link>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {recentPayments.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-gray-400">{t.dashboard.noPaymentsYet}</div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {recentPayments.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.student.fullName}</p>
                        <p className="text-xs text-gray-400">{new Date(0, p.month - 1).toLocaleString(dateLocale, { month: "long" })} {p.year}</p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-700 flex-shrink-0">{fmt(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{t.financeDashboard.topDebtors}</h2>
              <Link href="/debtors" className="text-xs text-blue-600 hover:underline font-medium">{t.common.viewAll}</Link>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {debtors.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-gray-400">{t.dashboard.noDebtors}</div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {debtors.slice(0, 8).map((d) => (
                    <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{d.fullName}</p>
                        <p className="text-xs text-gray-400 truncate">{d.groupName} · {d.daysOverdue}{t.dashboard.daysOverdueSuffix}</p>
                      </div>
                      <span className="text-sm font-semibold text-red-700 flex-shrink-0">{fmt(d.remainingDebt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{t.financeDashboard.payrollBreakdown}</h2>
            <Link href="/reports" className="text-xs text-blue-600 hover:underline font-medium">{t.common.viewAll}</Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {payroll.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">{t.financeDashboard.noPayroll}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.teachers.fullName}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.teachers.salaryType}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.financeDashboard.amountThisMonth}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {payroll.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{p.fullName}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {p.type === "FIXED" ? t.teachers.salaryTypeFixed : t.teachers.salaryTypePercentage}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{fmt(p.amount)} UZS</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-700">{t.financeDashboard.total}</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">{fmt(totalPayroll)} UZS</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
