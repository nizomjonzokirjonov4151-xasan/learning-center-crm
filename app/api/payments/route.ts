import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyNewPayment } from "@/lib/telegram";

export async function GET(request: Request) {
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
        student: { select: { id: true, fullName: true, phone: true } },
      },
    });
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    notifyNewPayment({
      studentName: payment.student.fullName,
      amount: payment.amount,
      period: `${MONTHS[payment.month - 1]} ${payment.year}`,
      note: payment.note,
    });
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("[POST /api/payments]", error);
    return NextResponse.json(
      { error: "Failed to create payment", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
