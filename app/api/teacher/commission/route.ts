import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/dal";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "TEACHER" || !session.teacherId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const groups = await prisma.group.findMany({
      where: { teacherId: session.teacherId },
      select: {
        id: true,
        name: true,
        monthlyFee: true,
        teacherPercent: true,
        _count: { select: { students: true } },
        students: {
          select: {
            payments: {
              where: { month: currentMonth, year: currentYear },
              select: { amount: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const breakdown = groups.map((g) => {
      const revenue = g.students.reduce(
        (sum, s) => sum + s.payments.reduce((ps, p) => ps + p.amount, 0),
        0
      );
      const earnedSalary = revenue * (g.teacherPercent / 100);
      return {
        groupId: g.id,
        groupName: g.name,
        studentCount: g._count.students,
        monthlyFee: g.monthlyFee,
        teacherPercent: g.teacherPercent,
        revenue,
        earnedSalary,
      };
    });

    const totalRevenue = breakdown.reduce((s, g) => s + g.revenue, 0);
    const totalSalary = breakdown.reduce((s, g) => s + g.earnedSalary, 0);

    return NextResponse.json({ breakdown, totalRevenue, totalSalary, month: currentMonth, year: currentYear });
  } catch (error) {
    console.error("[GET /api/teacher/commission]", error);
    return NextResponse.json(
      { error: "Failed to fetch commission data", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
