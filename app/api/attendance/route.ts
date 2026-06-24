import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AttendanceStatus } from "@/app/generated/prisma/client";
import { requireSession } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";

const STAFF_ROLES = ["ADMIN", "RECEPTION", "TEACHER"] as const;

export async function GET(request: Request) {
  const auth = await requireSession([...STAFF_ROLES]);
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const groupId = searchParams.get("groupId");

    const where: { date?: Date; groupId?: string; group?: { teacherId: string } } = {};
    if (dateParam) where.date = new Date(dateParam + "T00:00:00.000Z");
    if (groupId) where.groupId = groupId;
    if (auth.role === "TEACHER" && auth.teacherId) where.group = { teacherId: auth.teacherId };

    const records = await prisma.attendance.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { student: { fullName: "asc" } }],
      take: 200,
    });
    return NextResponse.json(records);
  } catch (error) {
    console.error("[GET /api/attendance]", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireSession([...STAFF_ROLES]);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const { groupId, date, records } = body as {
      groupId: string;
      date: string;
      records: { studentId: string; status: AttendanceStatus }[];
    };

    if (auth.role === "TEACHER") {
      const group = await prisma.group.findUnique({ where: { id: groupId }, select: { teacherId: true } });
      if (!group || group.teacherId !== auth.teacherId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const dateObj = new Date(date + "T00:00:00.000Z");

    const upserts = records.map(({ studentId, status }) =>
      prisma.attendance.upsert({
        where: { studentId_groupId_date: { studentId, groupId, date: dateObj } },
        create: { studentId, groupId, date: dateObj, status },
        update: { status },
      })
    );

    await prisma.$transaction(upserts);

    const flagged = records.filter((r) => r.status === "ABSENT" || r.status === "LATE");
    if (flagged.length > 0) {
      const [group, students] = await Promise.all([
        prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
        prisma.student.findMany({
          where: { id: { in: flagged.map((r) => r.studentId) } },
          select: { id: true, fullName: true, parent: { select: { userId: true } } },
        }),
      ]);
      for (const r of flagged) {
        const student = students.find((s) => s.id === r.studentId);
        if (!student?.parent) continue;
        createNotification(
          student.parent.userId,
          "ATTENDANCE",
          r.status === "ABSENT" ? "Absence recorded" : "Late arrival recorded",
          `${student.fullName} was marked ${r.status.toLowerCase()} in ${group?.name ?? "their group"} on ${date}.`
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/attendance]", error);
    return NextResponse.json(
      { error: "Failed to save attendance", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
