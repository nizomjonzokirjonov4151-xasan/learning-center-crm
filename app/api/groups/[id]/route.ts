import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/dal";

type Params = { params: Promise<{ id: string }> };

const groupInclude = {
  _count: { select: { students: true } },
  teacher: { select: { id: true, fullName: true, subject: true } },
} as const;

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role === "TEACHER" || session.role === "PARENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // MANAGER cannot change commission
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {
      name: body.name,
      description: body.description ?? null,
      monthlyFee: typeof body.monthlyFee === "number" ? body.monthlyFee : undefined,
      teacherId: body.teacherId ?? null,
    };

    if (session.role === "ADMIN" && typeof body.teacherPercent === "number") {
      data.teacherPercent = Math.min(100, Math.max(0, body.teacherPercent));
    }

    const group = await prisma.group.update({
      where: { id },
      data,
      include: groupInclude,
    });
    return NextResponse.json(group);
  } catch (error) {
    console.error("[PUT /api/groups/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update group", detail: error instanceof Error ? error.message : String(error) },
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
    await prisma.group.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/groups/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete group", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
