import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { AttendanceStatus } from "@/app/generated/prisma/client";
import { requireSession } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };
const STAFF_ROLES = ["ADMIN", "RECEPTION", "TEACHER"] as const;

async function assertOwnsRecord(id: string, auth: { role: string; teacherId: string | null }) {
  if (auth.role !== "TEACHER") return true;
  const record = await prisma.attendance.findUnique({ where: { id }, select: { group: { select: { teacherId: true } } } });
  return !!record && record.group.teacherId === auth.teacherId;
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireSession([...STAFF_ROLES]);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    if (!(await assertOwnsRecord(id, auth))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();
    const record = await prisma.attendance.update({
      where: { id },
      data: { status: body.status as AttendanceStatus },
      include: {
        student: { select: { id: true, fullName: true, parent: { select: { userId: true } } } },
        group: { select: { id: true, name: true } },
      },
    });
    if ((record.status === "ABSENT" || record.status === "LATE") && record.student.parent) {
      createNotification(
        record.student.parent.userId,
        "ATTENDANCE",
        record.status === "ABSENT" ? "Absence recorded" : "Late arrival recorded",
        `${record.student.fullName} was marked ${record.status.toLowerCase()} in ${record.group.name}.`
      );
    }
    return NextResponse.json(record);
  } catch (error) {
    console.error("[PUT /api/attendance/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update attendance", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireSession([...STAFF_ROLES]);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    if (!(await assertOwnsRecord(id, auth))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.attendance.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/attendance/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete attendance", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
