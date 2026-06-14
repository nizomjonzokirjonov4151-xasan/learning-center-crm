import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/dal";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "PARENT" || !session.parentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const students = await prisma.student.findMany({
      where: { parentId: session.parentId },
      include: {
        group: {
          include: {
            schedules: {
              include: { teacher: { select: { id: true, fullName: true, subject: true } } },
              orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
            },
          },
        },
        payments: { orderBy: { paymentDate: "desc" } },
        attendances: {
          orderBy: { date: "desc" },
          take: 90,
        },
      },
    });

    const today = new Date();
    const todayDay = today.getDay(); // 0=Sun,1=Mon,...,6=Sat

    const stats = students.map((s) => {
      const total = s.attendances.length;
      const present = s.attendances.filter((a) => a.status === "PRESENT").length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;

      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      const monthlyFee = s.group?.monthlyFee ?? 0;
      const paid = s.payments
        .filter((p) => p.year === currentYear && p.month === currentMonth)
        .reduce((sum, p) => sum + p.amount, 0);
      const debt = Math.max(0, monthlyFee - paid);

      const todaysSchedules = (s.group?.schedules ?? []).filter((sc) => sc.dayOfWeek === todayDay);

      return {
        id: s.id,
        fullName: s.fullName,
        phone: s.phone,
        createdAt: s.createdAt.toISOString(),
        group: s.group
          ? { id: s.group.id, name: s.group.name, monthlyFee: s.group.monthlyFee }
          : null,
        attendanceRate: rate,
        currentDebt: debt,
        todaysSchedules: todaysSchedules.map((sc) => ({
          id: sc.id,
          startTime: sc.startTime,
          endTime: sc.endTime,
          room: sc.room,
          teacher: sc.teacher,
          group: { name: s.group?.name ?? "" },
        })),
      };
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error("[GET /api/parent/dashboard]", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
