import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const payment = await prisma.payment.update({
      where: { id },
      data: {
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
    return NextResponse.json(payment);
  } catch (error) {
    console.error("[PUT /api/payments/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update payment", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.payment.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/payments/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete payment", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
