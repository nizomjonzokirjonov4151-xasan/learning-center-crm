import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AttendanceStatus } from "@/app/generated/prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const groupId = searchParams.get("groupId");

    const where: { date?: Date; groupId?: string } = {};
    if (dateParam) where.date = new Date(dateParam + "T00:00:00.000Z");
    if (groupId) where.groupId = groupId;

    const records = await prisma.attendance.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { student: { fullName: "asc" } }],
      take: 200,
    });
    return NextResponse.json(records);
  } catch (error) {
    console.error("[GET /api/attendance]", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { groupId, date, records } = body as {
      groupId: string;
      date: string;
      records: { studentId: string; status: AttendanceStatus }[];
    };

    const dateObj = new Date(date + "T00:00:00.000Z");

    const upserts = records.map(({ studentId, status }) =>
      prisma.attendance.upsert({
        where: { studentId_groupId_date: { studentId, groupId, date: dateObj } },
        create: { studentId, groupId, date: dateObj, status },
        update: { status },
      })
    );

    await prisma.$transaction(upserts);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/attendance]", error);
    return NextResponse.json(
      { error: "Failed to save attendance", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
