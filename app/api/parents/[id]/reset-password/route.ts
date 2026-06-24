import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/dal";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || !["ADMIN", "RECEPTION"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const { password } = body;

    if (!password?.trim() || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const parent = await prisma.parent.findUnique({ where: { id }, select: { userId: true } });
    if (!parent) return NextResponse.json({ error: "Parent not found." }, { status: 404 });

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: parent.userId },
      data: { password: hashed, forcePasswordChange: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/parents/[id]/reset-password]", error);
    return NextResponse.json(
      { error: "Failed to reset password", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
