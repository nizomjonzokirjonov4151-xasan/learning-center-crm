import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, capacity, floor, hasProjector, isActive } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Room name is required." }, { status: 400 });
    }
    const cap = Number(capacity);
    const flr = Number(floor);
    if (!Number.isInteger(cap) || cap < 1) {
      return NextResponse.json({ error: "Capacity must be a positive integer." }, { status: 400 });
    }
    if (!Number.isInteger(flr) || flr < 0) {
      return NextResponse.json({ error: "Floor must be 0 or a positive integer." }, { status: 400 });
    }

    const room = await prisma.room.update({
      where: { id },
      data: {
        name: name.trim(),
        capacity: cap,
        floor: flr,
        hasProjector: Boolean(hasProjector),
        isActive: Boolean(isActive),
      },
    });
    return NextResponse.json(room);
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "A room with this name already exists." }, { status: 409 });
    }
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }
    console.error("[PUT /api/rooms/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update room", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // Check if this room name is referenced by any schedule
    const room = await prisma.room.findUnique({ where: { id }, select: { name: true } });
    if (!room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }
    const schedulesUsingRoom = await prisma.schedule.count({ where: { room: room.name } });
    if (schedulesUsingRoom > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${schedulesUsingRoom} schedule(s) are using this room.` },
        { status: 409 }
      );
    }

    await prisma.room.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }
    console.error("[DELETE /api/rooms/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete room", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
