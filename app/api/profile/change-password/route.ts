import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession, createSessionCookie } from "@/lib/dal";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword?.trim() || !newPassword?.trim() || !confirmPassword?.trim()) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, password: true, forcePasswordChange: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: session.userId },
      data: { password: hashed, forcePasswordChange: false },
    });

    // Re-issue session with forcePasswordChange cleared, preserving sessionToken
    await createSessionCookie({
      userId: session.userId,
      role: session.role,
      fullName: session.fullName,
      email: session.email,
      teacherId: session.teacherId,
      parentId: session.parentId,
      forcePasswordChange: false,
      sessionToken: session.sessionToken,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/profile/change-password]", error);
    return NextResponse.json(
      { error: "Failed to change password", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
