import { NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await prisma.userSession.findMany({
    where: { userId: session.userId },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      lastSeenAt: true,
      createdAt: true,
      token: true,
    },
  });

  const result = sessions.map((s) => ({
    id: s.id,
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
    lastSeenAt: s.lastSeenAt,
    createdAt: s.createdAt,
    isCurrent: s.token === session.sessionToken,
  }));

  return NextResponse.json(result);
}

// DELETE /api/sessions — signs out all OTHER devices
export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.sessionToken) {
    return NextResponse.json({ error: "No active session token." }, { status: 400 });
  }

  await prisma.userSession.deleteMany({
    where: {
      userId: session.userId,
      token: { not: session.sessionToken },
    },
  });

  return NextResponse.json({ ok: true });
}
