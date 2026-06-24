import { NextResponse, NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

const teacherInclude = {
  user: { select: { id: true, email: true, isActive: true, createdAt: true, forcePasswordChange: true } },
} as const;

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireSession(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const body = await request.json();
    const { fullName, phone, subject, email, password, isActive } = body;

    if (!fullName?.trim() || !phone?.trim() || !subject?.trim()) {
      return NextResponse.json({ error: "Full name, phone, and subject are required." }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({ where: { teacherId: id } });

    if (!existingUser && (!email?.trim() || !password?.trim())) {
      return NextResponse.json(
        { error: "This teacher has no login yet — email and a temporary password are required to set one up." },
        { status: 400 }
      );
    }

    let emailNorm: string | undefined;
    if (email?.trim()) {
      emailNorm = email.trim().toLowerCase();
      const conflict = await prisma.user.findFirst({
        where: { email: emailNorm, NOT: { id: existingUser?.id ?? "" } },
      });
      if (conflict) {
        return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
      }
    }
    if (password?.trim() && password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const salaryType = body.salaryType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";

    const teacher = await prisma.$transaction(async (tx) => {
      await tx.teacher.update({
        where: { id },
        data: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          subject: subject.trim(),
          salaryType,
          salaryValue: body.salaryValue != null && body.salaryValue !== "" ? parseFloat(body.salaryValue) : null,
          isActive,
        },
      });

      if (existingUser) {
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            fullName: fullName.trim(),
            phone: phone.trim(),
            ...(emailNorm ? { email: emailNorm } : {}),
            isActive,
            ...(password?.trim() ? { password: await bcrypt.hash(password, 12), forcePasswordChange: true } : {}),
          },
        });
      } else if (emailNorm && password?.trim()) {
        await tx.user.create({
          data: {
            fullName: fullName.trim(),
            email: emailNorm,
            password: await bcrypt.hash(password, 12),
            phone: phone.trim(),
            role: "TEACHER",
            teacherId: id,
            isActive,
            forcePasswordChange: true,
          },
        });
      }

      return tx.teacher.findUniqueOrThrow({ where: { id }, include: teacherInclude });
    });

    return NextResponse.json(teacher);
  } catch (error) {
    console.error("[PUT /api/teachers/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update teacher", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireSession(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    await prisma.$transaction(async (tx) => {
      await tx.user.deleteMany({ where: { teacherId: id } });
      await tx.teacher.delete({ where: { id } });
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/teachers/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete teacher", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
