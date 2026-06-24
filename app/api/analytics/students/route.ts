import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireSession(["ADMIN", "RECEPTION", "ACCOUNTANT"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const now = new Date();

    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        start: d,
      };
    });

    const sixMonthsAgo = months[0].start;

    const [total, active, totalTeachers, totalGroups, recentStudents] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { groupId: { not: null } } }),
      prisma.teacher.count(),
      prisma.group.count(),
      prisma.student.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
      }),
    ]);

    const monthlyGrowth = months.map((m) => ({
      month: m.label,
      count: recentStudents.filter((s) => {
        const d = new Date(s.createdAt);
        return d.getMonth() + 1 === m.month && d.getFullYear() === m.year;
      }).length,
    }));

    return NextResponse.json({ total, active, totalTeachers, totalGroups, monthlyGrowth });
  } catch (error) {
    console.error("[GET /api/analytics/students]", error);
    return NextResponse.json({ error: "Failed to fetch student analytics" }, { status: 500 });
  }
}
