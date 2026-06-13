import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { groupId, teacherId, dayOfWeek, startTime, endTime, room } = body;

    if (!groupId || !teacherId || dayOfWeek == null || !startTime || !endTime || !room?.trim()) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (startTime >= endTime) {
      return NextResponse.json({ error: "Start time must be before end time." }, { status: 400 });
    }

    const day = Number(dayOfWeek);

    // Teacher conflict excluding self
    const teacherConflict = await prisma.schedule.findFirst({
      where: {
        teacherId,
        dayOfWeek: day,
        id: { not: id },
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
      include: { group: true },
    });
    if (teacherConflict) {
      return NextResponse.json({
        error: `Teacher conflict: already scheduled for "${teacherConflict.group.name}" (${teacherConflict.startTime}–${teacherConflict.endTime}) on this day.`,
      }, { status: 409 });
    }

    // Room conflict excluding self
    const roomConflict = await prisma.schedule.findFirst({
      where: {
        room: room.trim(),
        dayOfWeek: day,
        id: { not: id },
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
      include: { group: true },
    });
    if (roomConflict) {
      return NextResponse.json({
        error: `Room conflict: room "${room.trim()}" is already booked for "${roomConflict.group.name}" (${roomConflict.startTime}–${roomConflict.endTime}) on this day.`,
      }, { status: 409 });
    }

    const schedule = await prisma.schedule.update({
      where: { id },
      data: { groupId, teacherId, dayOfWeek: day, startTime, endTime, room: room.trim() },
      include: { group: true, teacher: true },
    });
    return NextResponse.json(schedule);
  } catch (error) {
    console.error("[PUT /api/schedules/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update schedule", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.schedule.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/schedules/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete schedule", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
