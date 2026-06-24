import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

export async function POST() {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;
  try {
    await prisma.notification.updateMany({
      where: { userId: auth.userId, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/notifications/read-all]", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
