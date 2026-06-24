import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/dal";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const { fullName, email, role, isActive, phone } = body;

    if (!fullName?.trim() || !email?.trim() || !role) {
      return NextResponse.json({ error: "fullName, email, and role are required." }, { status: 400 });
    }

    const current = await prisma.user.findUnique({ where: { id }, select: { role: true, teacherId: true } });
    if (!current) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if ((role === "TEACHER" && !current.teacherId) || (role === "PARENT" && current.role !== "PARENT")) {
      return NextResponse.json(
        { error: "Teacher and Parent accounts can only be created from the Teachers and Parents pages." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "Email already used by another account." }, { status: 409 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        role,
        isActive: isActive ?? true,
      },
      select: {
        id: true, fullName: true, email: true, phone: true, role: true,
        isActive: true, createdAt: true, teacherId: true,
        teacher: { select: { id: true, fullName: true, subject: true, phone: true, salaryType: true, salaryValue: true } },
      },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error("[PUT /api/users/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update user", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { id } = await params;

    if (session.userId === id) {
      return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/users/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete user", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
