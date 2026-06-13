import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29)
    );

    const [totals, recentRecords] = await Promise.all([
      prisma.attendance.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.attendance.findMany({
        where: { date: { gte: thirtyDaysAgo } },
        select: { date: true, status: true },
        orderBy: { date: "asc" },
      }),
    ]);

    const present = totals.find((r) => r.status === "PRESENT")?._count._all ?? 0;
    const absent = totals.find((r) => r.status === "ABSENT")?._count._all ?? 0;
    const late = totals.find((r) => r.status === "LATE")?._count._all ?? 0;
    const total = present + absent + late;

    const trend: { date: string; present: number; absent: number; late: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i)
      );
      const key = d.toISOString().split("T")[0];
      const dayRecs = recentRecords.filter(
        (r) => new Date(r.date).toISOString().split("T")[0] === key
      );
      trend.push({
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        present: dayRecs.filter((r) => r.status === "PRESENT").length,
        absent: dayRecs.filter((r) => r.status === "ABSENT").length,
        late: dayRecs.filter((r) => r.status === "LATE").length,
      });
    }

    return NextResponse.json({
      present,
      absent,
      late,
      total,
      presentPct: total > 0 ? Math.round((present / total) * 100) : 0,
      absentPct: total > 0 ? Math.round((absent / total) * 100) : 0,
      latePct: total > 0 ? Math.round((late / total) * 100) : 0,
      trend,
    });
  } catch (error) {
    console.error("[GET /api/analytics/attendance]", error);
    return NextResponse.json({ error: "Failed to fetch attendance analytics" }, { status: 500 });
  }
}
