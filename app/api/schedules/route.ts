import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const schedules = await prisma.schedule.findMany({
      include: { group: true, teacher: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return NextResponse.json(schedules);
  } catch (error) {
    console.error("[GET /api/schedules]", error);
    return NextResponse.json(
      { error: "Failed to fetch schedules", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { groupId, teacherId, dayOfWeek, startTime, endTime, room } = body;

    if (!groupId || !teacherId || dayOfWeek == null || !startTime || !endTime || !room?.trim()) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (startTime >= endTime) {
      return NextResponse.json({ error: "Start time must be before end time." }, { status: 400 });
    }

    const day = Number(dayOfWeek);

    // Teacher conflict: same teacher, same day, overlapping times
    const teacherConflict = await prisma.schedule.findFirst({
      where: {
        teacherId,
        dayOfWeek: day,
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
      include: { group: true },
    });
    if (teacherConflict) {
      return NextResponse.json({
        error: `Teacher conflict: already scheduled for "${teacherConflict.group.name}" (${teacherConflict.startTime}–${teacherConflict.endTime}) on this day.`,
      }, { status: 409 });
    }

    // Room conflict: same room, same day, overlapping times
    const roomConflict = await prisma.schedule.findFirst({
      where: {
        room: room.trim(),
        dayOfWeek: day,
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
      include: { group: true },
    });
    if (roomConflict) {
      return NextResponse.json({
        error: `Room conflict: room "${room.trim()}" is already booked for "${roomConflict.group.name}" (${roomConflict.startTime}–${roomConflict.endTime}) on this day.`,
      }, { status: 409 });
    }

    const schedule = await prisma.schedule.create({
      data: { groupId, teacherId, dayOfWeek: day, startTime, endTime, room: room.trim() },
      include: { group: true, teacher: true },
    });
    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error("[POST /api/schedules]", error);
    return NextResponse.json(
      { error: "Failed to create schedule", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
