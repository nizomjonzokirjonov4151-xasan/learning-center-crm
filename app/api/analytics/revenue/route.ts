import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireSession(["ADMIN", "RECEPTION", "ACCOUNTANT"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        month: d.getMonth() + 1,
        year: d.getFullYear(),
      };
    });

    const [payments, totalAgg, monthAgg, paymentCount] = await Promise.all([
      prisma.payment.findMany({
        where: { OR: months.map((m) => ({ month: m.month, year: m.year })) },
        select: { amount: true, month: true, year: true },
      }),
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.payment.aggregate({
        where: { month: currentMonth, year: currentYear },
        _sum: { amount: true },
      }),
      prisma.payment.count(),
    ]);

    const monthlyRevenue = months.map((m) => ({
      month: m.label,
      revenue: payments
        .filter((p) => p.month === m.month && p.year === m.year)
        .reduce((sum, p) => sum + p.amount, 0),
    }));

    return NextResponse.json({
      monthlyRevenue,
      totalRevenue: totalAgg._sum.amount ?? 0,
      thisMonthRevenue: monthAgg._sum.amount ?? 0,
      paymentCount,
    });
  } catch (error) {
    console.error("[GET /api/analytics/revenue]", error);
    return NextResponse.json({ error: "Failed to fetch revenue analytics" }, { status: 500 });
  }
}
