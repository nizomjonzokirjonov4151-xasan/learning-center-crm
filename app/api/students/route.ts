import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyNewStudent } from "@/lib/telegram";
import { getSession } from "@/lib/dal";

const studentInclude = {
  group: {
    select: {
      id: true,
      name: true,
      teacher: { select: { id: true, fullName: true, subject: true } },
    },
  },
} as const;

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");

    // TEACHER sees only their own students (via group assignment)
    const teacherFilter =
      session?.role === "TEACHER" && session.teacherId
        ? { group: { teacherId: session.teacherId } }
        : {};

    const students = await prisma.student.findMany({
      where: {
        ...(groupId ? { groupId } : {}),
        ...teacherFilter,
      },
      include: studentInclude,
      orderBy: { fullName: "asc" },
    });
    return NextResponse.json(students);
  } catch (error) {
    console.error("[GET /api/students]", error);
    return NextResponse.json(
      { error: "Failed to fetch students", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role === "TEACHER" || session.role === "PARENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();

    if (!body.fullName?.trim()) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }
    if (!body.phone?.trim()) {
      return NextResponse.json({ error: "Phone is required." }, { status: 400 });
    }
    if (!body.groupId) {
      return NextResponse.json({ error: "Group is required." }, { status: 400 });
    }

    const student = await prisma.student.create({
      data: {
        fullName: body.fullName.trim(),
        phone: body.phone.trim(),
        groupId: body.groupId,
      },
      include: studentInclude,
    });
    notifyNewStudent({ fullName: student.fullName, phone: student.phone });
    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error("[POST /api/students]", error);
    return NextResponse.json(
      { error: "Failed to create student", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
