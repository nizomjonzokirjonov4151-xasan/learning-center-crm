import cron from "node-cron";
import { sendDailyReport } from "./telegram";
import { prisma } from "./prisma";
import { createNotification } from "./notifications";

let initialized = false;

export function scheduleDailyReport(): void {
  if (initialized) return;
  initialized = true;

  // Every day at 21:00 server local time
  cron.schedule("0 21 * * *", async () => {
    console.log("[Cron] Sending daily Telegram report…");
    const ok = await sendDailyReport();
    console.log(`[Cron] Daily report ${ok ? "sent ✓" : "failed ✗"}`);
  });

  // 1st of each month at 09:00 server local time — notify teachers of last month's earnings
  cron.schedule("0 9 1 * *", async () => {
    console.log("[Cron] Sending monthly salary notifications…");
    await notifyMonthlySalaries();
  });

  console.log("[Cron] Daily Telegram report scheduled at 21:00, monthly salary notifications on the 1st at 09:00");
}

async function notifyMonthlySalaries(): Promise<void> {
  const now = new Date();
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const month = prevMonthDate.getMonth() + 1;
  const year = prevMonthDate.getFullYear();
  const monthLabel = prevMonthDate.toLocaleString("en-US", { month: "long", year: "numeric" });

  try {
    const teachers = await prisma.teacher.findMany({
      where: { isActive: true, user: { isNot: null } },
      select: {
        salaryType: true,
        salaryValue: true,
        user: { select: { id: true } },
        groups: {
          select: {
            teacherPercent: true,
            students: { select: { payments: { where: { month, year }, select: { amount: true } } } },
          },
        },
      },
    });

    for (const teacher of teachers) {
      if (!teacher.user) continue;
      const amount =
        teacher.salaryType === "FIXED"
          ? teacher.salaryValue ?? 0
          : teacher.groups.reduce((sum, g) => {
              const revenue = g.students.reduce((s, st) => s + st.payments.reduce((ps, p) => ps + p.amount, 0), 0);
              return sum + revenue * (g.teacherPercent / 100);
            }, 0);

      await createNotification(
        teacher.user.id,
        "SALARY",
        `Earnings for ${monthLabel}`,
        `Your computed earnings for ${monthLabel} are ${new Intl.NumberFormat("en-US").format(Math.round(amount))} UZS.`
      );
    }
    console.log(`[Cron] Monthly salary notifications sent to ${teachers.length} teacher(s)`);
  } catch (error) {
    console.error("[Cron] Failed to send monthly salary notifications", error);
  }
}
