import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyNewGroup } from "@/lib/telegram";
import { getSession } from "@/lib/dal";

const groupInclude = {
  _count: { select: { students: true } },
  teacher: { select: { id: true, fullName: true, subject: true } },
} as const;

export async function GET() {
  try {
    const session = await getSession();
    const where =
      session?.role === "TEACHER" && session.teacherId
        ? { teacherId: session.teacherId }
        : {};
    const groups = await prisma.group.findMany({
      where,
      include: groupInclude,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(groups);
  } catch (error) {
    console.error("[GET /api/groups]", error);
    return NextResponse.json(
      { error: "Failed to fetch groups", detail: error instanceof Error ? error.message : String(error) },
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

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Group name is required." }, { status: 400 });
    }

    const teacherPercent = typeof body.teacherPercent === "number"
      ? Math.min(100, Math.max(0, body.teacherPercent))
      : 40;

    const group = await prisma.group.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        monthlyFee: typeof body.monthlyFee === "number" ? body.monthlyFee : 0,
        teacherPercent,
        teacherId: body.teacherId || null,
      },
      include: groupInclude,
    });
    notifyNewGroup({ name: group.name, description: group.description });
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("[POST /api/groups]", error);
    return NextResponse.json(
      { error: "Failed to create group", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
