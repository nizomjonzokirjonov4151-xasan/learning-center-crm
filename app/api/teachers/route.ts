import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { notifyNewTeacher } from "@/lib/telegram";
import { requireSession } from "@/lib/api-auth";

const teacherInclude = {
  user: { select: { id: true, email: true, isActive: true, createdAt: true, forcePasswordChange: true } },
} as const;

export async function GET() {
  const auth = await requireSession(["ADMIN", "RECEPTION"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const teachers = await prisma.teacher.findMany({
      orderBy: { createdAt: "desc" },
      include: teacherInclude,
    });
    return NextResponse.json(teachers);
  } catch (error) {
    console.error("[GET /api/teachers]", error);
    return NextResponse.json(
      { error: "Failed to fetch teachers", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireSession(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const { fullName, phone, subject, email, password } = body;

    if (!fullName?.trim() || !phone?.trim() || !subject?.trim()) {
      return NextResponse.json({ error: "Full name, phone, and subject are required." }, { status: 400 });
    }
    if (!email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: "Email and temporary password are required to create a teacher login." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const emailNorm = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
    }

    const salaryType = body.salaryType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";
    const hashed = await bcrypt.hash(password, 12);

    const teacher = await prisma.$transaction(async (tx) => {
      const created = await tx.teacher.create({
        data: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          subject: subject.trim(),
          salaryType,
          salaryValue: body.salaryValue != null && body.salaryValue !== "" ? parseFloat(body.salaryValue) : null,
          isActive: body.isActive ?? true,
        },
      });
      await tx.user.create({
        data: {
          fullName: fullName.trim(),
          email: emailNorm,
          password: hashed,
          phone: phone.trim(),
          role: "TEACHER",
          teacherId: created.id,
          forcePasswordChange: true,
        },
      });
      return tx.teacher.findUniqueOrThrow({ where: { id: created.id }, include: teacherInclude });
    });

    notifyNewTeacher({
      fullName: teacher.fullName,
      phone: teacher.phone,
      subject: teacher.subject,
      salaryType: teacher.salaryType,
      salaryValue: teacher.salaryValue,
    });
    return NextResponse.json(teacher, { status: 201 });
  } catch (error) {
    console.error("[POST /api/teachers]", error);
    return NextResponse.json(
      { error: "Failed to create teacher", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
