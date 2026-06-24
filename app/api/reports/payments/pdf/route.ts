import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPdf } from "@/lib/report-pdf";
import { requireSession } from "@/lib/api-auth";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export async function GET() {
  const auth = await requireSession(["ADMIN", "RECEPTION", "ACCOUNTANT"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const payments = await prisma.payment.findMany({
      include: { student: { select: { fullName: true } } },
      orderBy: { paymentDate: "desc" },
    });

    const total = payments.reduce((s, p) => s + p.amount, 0);
    const fmt = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n));

    const now = new Date();
    const thisMonth = payments
      .filter((p) => p.month === now.getMonth() + 1 && p.year === now.getFullYear())
      .reduce((s, p) => s + p.amount, 0);

    const buffer = await buildPdf(
      "Payments Report",
      [
        { label: "Total Payments", value: String(payments.length) },
        { label: "Total Revenue", value: fmt(total) + " UZS" },
        { label: "This Month Revenue", value: fmt(thisMonth) + " UZS" },
      ],
      [
        { label: "#", x: 50, w: 25 },
        { label: "Student", x: 75, w: 135 },
        { label: "Amount (UZS)", x: 210, w: 90 },
        { label: "Period", x: 300, w: 65 },
        { label: "Date", x: 365, w: 90 },
        { label: "Note", x: 455, w: 90 },
      ],
      payments.map((p, i) => [
        String(i + 1),
        p.student.fullName,
        fmt(p.amount),
        `${MONTHS[p.month - 1]} ${p.year}`,
        new Date(p.paymentDate).toLocaleDateString("en-US"),
        p.note ?? "—",
      ])
    );

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="payments-report.pdf"',
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/payments/pdf]", error);
    return new Response(JSON.stringify({ error: "Failed to generate PDF" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
