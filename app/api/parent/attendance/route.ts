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
    // Get student IDs that belong to this parent
    const parentStudents = await prisma.student.findMany({
      where: { parentId: session.parentId },
      select: { id: true },
    });
    const allowedIds = parentStudents.map((s) => s.id);

    if (allowedIds.length === 0) return NextResponse.json([]);

    // Security: if studentId is provided, verify it belongs to this parent
    if (studentId && !allowedIds.includes(studentId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const where = studentId
      ? { studentId }
      : { studentId: { in: allowedIds } };

    const records = await prisma.attendance.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }],
      take: 200,
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error("[GET /api/parent/attendance]", error);
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}
