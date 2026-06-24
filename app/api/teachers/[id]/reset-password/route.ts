import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireSession(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const body = await request.json();
    const { password } = body;

    if (!password?.trim() || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const user = await prisma.user.findFirst({ where: { teacherId: id }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "This teacher has no login account yet." }, { status: 404 });

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, forcePasswordChange: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/teachers/[id]/reset-password]", error);
    return NextResponse.json(
      { error: "Failed to reset password", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
