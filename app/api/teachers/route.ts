import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyNewTeacher } from "@/lib/telegram";

export async function GET() {
  try {
    const teachers = await prisma.teacher.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(teachers);
  } catch (error) {
    console.error("[GET /api/teachers]", error);
    return NextResponse.json(
      { error: "Failed to fetch teachers", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const teacher = await prisma.teacher.create({
      data: {
        fullName: body.fullName.trim(),
        phone: body.phone.trim(),
        subject: body.subject.trim(),
        salary: parseFloat(body.salary),
        isActive: body.isActive ?? true,
      },
    });
    notifyNewTeacher({ fullName: teacher.fullName, phone: teacher.phone, subject: teacher.subject, salary: teacher.salary });
    return NextResponse.json(teacher, { status: 201 });
  } catch (error) {
    console.error("[POST /api/teachers]", error);
    return NextResponse.json(
      { error: "Failed to create teacher", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
