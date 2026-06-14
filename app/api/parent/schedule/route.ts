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
      select: { id: true, fullName: true, groupId: true },
    });
    const allowedIds = parentStudents.map((s) => s.id);

    if (allowedIds.length === 0) return NextResponse.json([]);

    if (studentId && !allowedIds.includes(studentId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetStudents = studentId
      ? parentStudents.filter((s) => s.id === studentId)
      : parentStudents;

    const groupIds = targetStudents
      .map((s) => s.groupId)
      .filter((gid): gid is string => gid !== null);

    const schedules = await prisma.schedule.findMany({
      where: { groupId: { in: groupIds } },
      include: {
        group: { select: { id: true, name: true } },
        teacher: { select: { id: true, fullName: true, subject: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error("[GET /api/parent/schedule]", error);
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
  }
}
