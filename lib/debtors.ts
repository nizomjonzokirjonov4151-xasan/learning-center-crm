import { prisma } from "@/lib/prisma";

export type Debtor = {
  id: string;
  fullName: string;
  phone: string;
  groupName: string;
  monthlyFee: number;
  amountPaid: number;
  remainingDebt: number;
  daysOverdue: number;
};

export async function getDebtors(): Promise<Debtor[]> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = prevMonthDate.getMonth() + 1;
  const prevYear = prevMonthDate.getFullYear();

  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 1);
  const msPerDay = 1000 * 60 * 60 * 24;
  const today = Date.now();

  const students = await prisma.student.findMany({
    where: { groupId: { not: null } },
    include: {
      group: true,
      payments: {
        where: {
          OR: [
            { month: currentMonth, year: currentYear },
            { month: prevMonth, year: prevYear },
          ],
        },
        select: { amount: true, month: true, year: true },
      },
    },
  });

  const debtors: Debtor[] = [];

  for (const student of students) {
    const group = student.group;
    if (!group || group.monthlyFee <= 0) continue;

    const monthlyFee = group.monthlyFee;

    const currentPaid = student.payments
      .filter((p) => p.month === currentMonth && p.year === currentYear)
      .reduce((s, p) => s + p.amount, 0);
    const prevPaid = student.payments
      .filter((p) => p.month === prevMonth && p.year === prevYear)
      .reduce((s, p) => s + p.amount, 0);

    const currentDebt = Math.max(0, monthlyFee - currentPaid);
    const prevDebt = Math.max(0, monthlyFee - prevPaid);
    const totalDebt = currentDebt + prevDebt;

    if (totalDebt <= 0) continue;

    const daysOverdue =
      prevDebt > 0
        ? Math.floor((today - prevMonthStart.getTime()) / msPerDay)
        : Math.floor((today - currentMonthStart.getTime()) / msPerDay);

    debtors.push({
      id: student.id,
      fullName: student.fullName,
      phone: student.phone,
      groupName: group.name,
      monthlyFee,
      amountPaid: currentPaid + prevPaid,
      remainingDebt: totalDebt,
      daysOverdue,
    });
  }

  debtors.sort((a, b) => b.daysOverdue - a.daysOverdue || b.remainingDebt - a.remainingDebt);

  return debtors;
}
