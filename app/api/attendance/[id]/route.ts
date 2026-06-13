import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { AttendanceStatus } from "@/app/generated/prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const record = await prisma.attendance.update({
      where: { id },
      data: { status: body.status as AttendanceStatus },
      include: {
        student: { select: { id: true, fullName: true } },
        group: { select: { id: true, name: true } },
      },
    });
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
  try {
    const { id } = await params;
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
