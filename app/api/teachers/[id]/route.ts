import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const teacher = await prisma.teacher.update({
      where: { id },
      data: {
        fullName: body.fullName.trim(),
        phone: body.phone.trim(),
        subject: body.subject.trim(),
        salary: parseFloat(body.salary),
        isActive: body.isActive,
      },
    });
    return NextResponse.json(teacher);
  } catch (error) {
    console.error("[PUT /api/teachers/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update teacher", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.teacher.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/teachers/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete teacher", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
