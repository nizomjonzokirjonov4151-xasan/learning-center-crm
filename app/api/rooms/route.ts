import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireSession(["ADMIN", "RECEPTION"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rooms);
  } catch (error) {
    console.error("[GET /api/rooms]", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireSession(["ADMIN", "RECEPTION"]);
  if (auth instanceof NextResponse) return auth;
  try {
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

    const room = await prisma.room.create({
      data: {
        name: name.trim(),
        capacity: cap,
        floor: flr,
        hasProjector: Boolean(hasProjector),
        isActive: isActive !== false,
      },
    });
    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "A room with this name already exists." }, { status: 409 });
    }
    console.error("[POST /api/rooms]", error);
    return NextResponse.json(
      { error: "Failed to create room", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
