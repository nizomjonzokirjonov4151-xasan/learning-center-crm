import { prisma } from "@/lib/prisma";
import { buildPdf } from "@/lib/report-pdf";

export async function GET() {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const teachers = await prisma.teacher.findMany({
      orderBy: { fullName: "asc" },
      include: {
        groups: {
          select: {
            teacherPercent: true,
            students: {
              select: {
                payments: {
                  where: { month: currentMonth, year: currentYear },
                  select: { amount: true },
                },
              },
            },
          },
        },
      },
    });

    const active = teachers.filter((t) => t.isActive).length;
    const totalBaseSalary = teachers.filter((t) => t.isActive).reduce((s, t) => s + t.salary, 0);

    type TeacherRow = { teacherPercent: number; revenue: number };
    const enriched = teachers.map((t) => {
      const groups: TeacherRow[] = t.groups.map((g) => {
        const revenue = g.students.reduce(
          (sum, s) => sum + s.payments.reduce((ps, p) => ps + p.amount, 0),
          0
        );
        return { teacherPercent: g.teacherPercent, revenue };
      });
      const totalRevenue = groups.reduce((s, g) => s + g.revenue, 0);
      const totalEarned = groups.reduce((s, g) => s + g.revenue * (g.teacherPercent / 100), 0);
      const avgCommission =
        groups.length > 0
          ? Math.round(groups.reduce((s, g) => s + g.teacherPercent, 0) / groups.length)
          : 0;
      return { ...t, groupCount: t.groups.length, avgCommission, totalRevenue, totalEarned };
    });

    const totalEarnedAll = enriched.filter((t) => t.isActive).reduce((s, t) => s + t.totalEarned, 0);
    const fmt = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n));

    const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

    const buffer = await buildPdf(
      `Teachers Report — ${monthLabel}`,
      [
        { label: "Total Teachers", value: String(teachers.length) },
        { label: "Active", value: String(active) },
        { label: "Inactive", value: String(teachers.length - active) },
        { label: "Monthly Base Payroll (Active)", value: fmt(totalBaseSalary) + " UZS" },
        { label: "Earned Commissions (Active)", value: fmt(totalEarnedAll) + " UZS" },
      ],
      [
        { label: "#", x: 50, w: 20 },
        { label: "Full Name", x: 70, w: 110 },
        { label: "Phone", x: 180, w: 80 },
        { label: "Subject", x: 260, w: 80 },
        { label: "Base Salary", x: 340, w: 65 },
        { label: "Groups", x: 405, w: 30 },
        { label: "Comm%", x: 435, w: 35 },
        { label: `Earned (${now.toLocaleString("en-US", { month: "short" })})`, x: 470, w: 75 },
      ],
      enriched.map((t, i) => [
        String(i + 1),
        t.fullName,
        t.phone,
        t.subject,
        fmt(t.salary),
        String(t.groupCount),
        t.groupCount > 0 ? `${t.avgCommission}%` : "—",
        t.isActive ? fmt(t.totalEarned) : "—",
      ])
    );

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="teachers-report.pdf"',
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/teachers/pdf]", error);
    return new Response(JSON.stringify({ error: "Failed to generate PDF" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
