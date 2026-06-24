import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyNewPayment } from "@/lib/telegram";
import { requireSession } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";

const FINANCE_ROLES = ["ADMIN", "RECEPTION", "ACCOUNTANT"] as const;

export async function GET(request: Request) {
  const auth = await requireSession([...FINANCE_ROLES]);
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const where: { studentId?: string; month?: number; year?: number } = {};
    if (studentId) where.studentId = studentId;
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    const payments = await prisma.payment.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true, phone: true } },
      },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      take: 200,
    });
    return NextResponse.json(payments);
  } catch (error) {
    console.error("[GET /api/payments]", error);
    return NextResponse.json(
      { error: "Failed to fetch payments", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireSession([...FINANCE_ROLES]);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const payment = await prisma.payment.create({
      data: {
        studentId: body.studentId,
        amount: parseFloat(body.amount),
        paymentDate: new Date(body.paymentDate + "T00:00:00.000Z"),
        month: parseInt(body.month),
        year: parseInt(body.year),
        note: body.note?.trim() || null,
      },
      include: {
        student: { select: { id: true, fullName: true, phone: true, parent: { select: { userId: true } } } },
      },
    });
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const period = `${MONTHS[payment.month - 1]} ${payment.year}`;
    notifyNewPayment({
      studentName: payment.student.fullName,
      amount: payment.amount,
      period,
      note: payment.note,
    });
    if (payment.student.parent) {
      createNotification(
        payment.student.parent.userId,
        "PAYMENT",
        "Payment received",
        `A payment of ${new Intl.NumberFormat("en-US").format(payment.amount)} UZS was recorded for ${payment.student.fullName} (${period}).`
      );
    }
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("[POST /api/payments]", error);
    return NextResponse.json(
      { error: "Failed to create payment", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
