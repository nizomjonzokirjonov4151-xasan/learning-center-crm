import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/dal";

type Params = { params: Promise<{ id: string }> };

const studentInclude = {
  group: {
    select: {
      id: true,
      name: true,
      teacher: { select: { id: true, fullName: true, subject: true } },
    },
  },
} as const;

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role === "TEACHER" || session.role === "PARENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const student = await prisma.student.update({
      where: { id },
      data: {
        fullName: body.fullName,
        phone: body.phone,
        ...(body.groupId !== undefined ? { groupId: body.groupId || null } : {}),
      },
      include: studentInclude,
    });
    return NextResponse.json(student);
  } catch (error) {
    console.error("[PUT /api/students/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update student", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role === "TEACHER" || session.role === "PARENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await prisma.student.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/students/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete student", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
