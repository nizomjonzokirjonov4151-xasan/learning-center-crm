import { prisma } from "./prisma";

const TG_API = "https://api.telegram.org/bot";

// ── Internal helpers ──────────────────────────────────────────────────────────

async function tgFetch(
  token: string,
  method: string,
  body?: object
): Promise<{ ok: boolean; result?: unknown; description?: string }> {
  const res = await fetch(`${TG_API}${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json() as Promise<{ ok: boolean; result?: unknown; description?: string }>;
}

async function getBotAndChat(): Promise<{ token: string; chatId: string } | null> {
  const s = await prisma.botSettings.findUnique({ where: { id: "default" } });
  if (!s || !s.isActive || !s.botToken || !s.adminChatId) return null;
  return { token: s.botToken, chatId: s.adminChatId };
}

// ── Core send ─────────────────────────────────────────────────────────────────

export async function sendMessage(html: string): Promise<boolean> {
  try {
    const ctx = await getBotAndChat();
    if (!ctx) return false;
    const res = await tgFetch(ctx.token, "sendMessage", {
      chat_id: ctx.chatId,
      text: html,
      parse_mode: "HTML",
    });
    return res.ok;
  } catch (err) {
    console.error("[Telegram] sendMessage failed:", err);
    return false;
  }
}

// ── Test connection ───────────────────────────────────────────────────────────

export async function testConnection(
  token: string,
  chatId: string
): Promise<{ ok: boolean; botName?: string; error?: string }> {
  try {
    const meRes = await tgFetch(token, "getMe");
    if (!meRes.ok) {
      return { ok: false, error: meRes.description ?? "Invalid token" };
    }
    const me = meRes.result as { username?: string; first_name: string };
    const msgRes = await tgFetch(token, "sendMessage", {
      chat_id: chatId,
      text: `✅ <b>Connection Successful!</b>\n\nO'quv Markaz CRM is now connected.\n🤖 Bot: @${me.username ?? me.first_name}`,
      parse_mode: "HTML",
    });
    if (!msgRes.ok) {
      return { ok: false, error: msgRes.description ?? "Could not send message" };
    }
    return { ok: true, botName: me.username ?? me.first_name };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Notification helpers ──────────────────────────────────────────────────────

export function notifyNewStudent(student: {
  fullName: string;
  phone: string;
  groupName?: string | null;
}): void {
  sendMessage(
    `🎓 <b>New Student Added</b>\n\n` +
      `👤 <b>Name:</b> ${student.fullName}\n` +
      `📞 <b>Phone:</b> ${student.phone}\n` +
      `📁 <b>Group:</b> ${student.groupName ?? "Unassigned"}`
  ).catch(() => {});
}

export function notifyNewTeacher(teacher: {
  fullName: string;
  phone: string;
  subject: string;
  salary: number;
}): void {
  sendMessage(
    `👨‍🏫 <b>New Teacher Added</b>\n\n` +
      `👤 <b>Name:</b> ${teacher.fullName}\n` +
      `📞 <b>Phone:</b> ${teacher.phone}\n` +
      `📚 <b>Subject:</b> ${teacher.subject}\n` +
      `💵 <b>Salary:</b> ${new Intl.NumberFormat("en-US").format(teacher.salary)} UZS`
  ).catch(() => {});
}

export function notifyNewGroup(group: {
  name: string;
  description?: string | null;
}): void {
  sendMessage(
    `📁 <b>New Group Created</b>\n\n` +
      `📋 <b>Name:</b> ${group.name}\n` +
      `📝 <b>Description:</b> ${group.description ?? "—"}`
  ).catch(() => {});
}

export function notifyNewPayment(payment: {
  studentName: string;
  amount: number;
  period: string;
  note?: string | null;
}): void {
  const parts = [
    `💰 <b>New Payment Recorded</b>\n`,
    `👤 <b>Student:</b> ${payment.studentName}`,
    `💵 <b>Amount:</b> ${new Intl.NumberFormat("en-US").format(payment.amount)} UZS`,
    `📅 <b>Period:</b> ${payment.period}`,
  ];
  if (payment.note) parts.push(`📝 <b>Note:</b> ${payment.note}`);
  sendMessage(parts.join("\n")).catch(() => {});
}

// ── Daily report ──────────────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

async function getDebtorsSummary(): Promise<{ count: number; totalDebt: number }> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = prevDate.getMonth() + 1;
  const prevYear = prevDate.getFullYear();

  const students = await prisma.student.findMany({
    where: { groupId: { not: null } },
    include: {
      group: { select: { monthlyFee: true } },
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

  let count = 0;
  let totalDebt = 0;
  for (const s of students) {
    if (!s.group || s.group.monthlyFee <= 0) continue;
    const fee = s.group.monthlyFee;
    const curPaid = s.payments.filter(p => p.month === currentMonth && p.year === currentYear).reduce((a, p) => a + p.amount, 0);
    const prevPaid = s.payments.filter(p => p.month === prevMonth && p.year === prevYear).reduce((a, p) => a + p.amount, 0);
    const debt = Math.max(0, fee - curPaid) + Math.max(0, fee - prevPaid);
    if (debt > 0) { count++; totalDebt += debt; }
  }
  return { count, totalDebt };
}

export async function sendDailyReport(): Promise<boolean> {
  try {
    const now = new Date();
    const todayUtc = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    );
    const tomorrowUtc = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    );

    const [totalStudents, totalGroups, attendanceGroups, todayPayments, debtors] =
      await Promise.all([
        prisma.student.count(),
        prisma.group.count(),
        prisma.attendance.groupBy({
          by: ["status"],
          where: { date: { gte: todayUtc, lt: tomorrowUtc } },
          _count: { _all: true },
        }),
        prisma.payment.findMany({
          where: { paymentDate: { gte: todayUtc, lt: tomorrowUtc } },
          select: { amount: true },
        }),
        getDebtorsSummary(),
      ]);

    const present =
      attendanceGroups.find((g) => g.status === "PRESENT")?._count._all ?? 0;
    const absent =
      attendanceGroups.find((g) => g.status === "ABSENT")?._count._all ?? 0;
    const late =
      attendanceGroups.find((g) => g.status === "LATE")?._count._all ?? 0;
    const attendanceTotal = present + absent + late;
    const todayRevenue = todayPayments.reduce((s, p) => s + p.amount, 0);

    const dateStr = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

    const lines = [
      `📊 <b>Daily Report — ${dateStr}</b>`,
      ``,
      `👥 <b>Students:</b> ${totalStudents}`,
      `📁 <b>Groups:</b> ${totalGroups}`,
      ``,
      `📋 <b>Today's Attendance</b>`,
      `  ✅ Present: <b>${present}</b>`,
      `  ❌ Absent: <b>${absent}</b>`,
      `  ⏰ Late: <b>${late}</b>`,
      `  📊 Total: <b>${attendanceTotal}</b>`,
      ``,
      `💰 <b>Today's Payments</b>`,
      `  🧾 Count: <b>${todayPayments.length}</b>`,
      `  💵 Total: <b>${new Intl.NumberFormat("en-US").format(todayRevenue)} UZS</b>`,
      ``,
      `⚠️ <b>Debtors Report</b>`,
      `  👤 Students with debt: <b>${debtors.count}</b>`,
      `  💸 Total debt: <b>${new Intl.NumberFormat("en-US").format(debtors.totalDebt)} UZS</b>`,
    ];

    return await sendMessage(lines.join("\n"));
  } catch (err) {
    console.error("[Telegram] Daily report failed:", err);
    return false;
  }
}
