import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyNewStudent } from "@/lib/telegram";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");
    const students = await prisma.student.findMany({
      where: groupId ? { groupId } : undefined,
      orderBy: { fullName: "asc" },
    });
    return NextResponse.json(students);
  } catch (error) {
    console.error("[GET /api/students]", error);
    return NextResponse.json(
      {
        error: "Failed to fetch students",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const student = await prisma.student.create({
      data: {
        fullName: body.fullName,
        phone: body.phone,
      },
    });
    notifyNewStudent({ fullName: student.fullName, phone: student.phone });
    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error("[POST /api/students]", error);
    return NextResponse.json(
      {
        error: "Failed to create student",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
