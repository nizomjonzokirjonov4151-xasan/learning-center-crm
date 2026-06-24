import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_request: NextRequest, { params }: Params) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const notification = await prisma.notification.findUnique({ where: { id }, select: { userId: true } });
    if (!notification || notification.userId !== auth.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.notification.update({ where: { id }, data: { isRead: true } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/notifications/[id]]", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
