import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/dal";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PARENT" || !session.parentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");

  try {
    const parentStudents = await prisma.student.findMany({
      where: { parentId: session.parentId },
      select: { id: true, fullName: true, group: { select: { monthlyFee: true } } },
    });
    const allowedIds = parentStudents.map((s) => s.id);

    if (allowedIds.length === 0) return NextResponse.json({ payments: [], students: [] });

    if (studentId && !allowedIds.includes(studentId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const where = studentId
      ? { studentId }
      : { studentId: { in: allowedIds } };

    const payments = await prisma.payment.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true } },
      },
      orderBy: [{ paymentDate: "desc" }],
      take: 200,
    });

    return NextResponse.json({ payments, students: parentStudents });
  } catch (error) {
    console.error("[GET /api/parent/payments]", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}
