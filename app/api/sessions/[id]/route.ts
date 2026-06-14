import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

// DELETE /api/sessions/:id — revoke a specific session owned by the current user
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const dbSession = await prisma.userSession.findUnique({
    where: { id },
    select: { userId: true, token: true },
  });

  if (!dbSession || dbSession.userId !== session.userId) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  // Prevent revoking the current session via this endpoint (use logout instead)
  if (dbSession.token === session.sessionToken) {
    return NextResponse.json({ error: "Use sign-out to end your current session." }, { status: 400 });
  }

  await prisma.userSession.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
