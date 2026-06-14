import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/dal";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        teacherId: true,
        teacher: {
          select: { id: true, fullName: true, subject: true, phone: true, salary: true },
        },
        _count: {
          select: { userSessions: true },
        },
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("[GET /api/users]", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { fullName, email, password, role, phone, subject, salary } = body;

    if (!fullName?.trim() || !email?.trim() || !password?.trim() || !role) {
      return NextResponse.json({ error: "fullName, email, password, and role are required." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }
    if (!["ADMIN", "MANAGER", "TEACHER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);

    if (role === "TEACHER") {
      if (!phone?.trim() || !subject?.trim() || salary == null) {
        return NextResponse.json(
          { error: "phone, subject, and salary are required for teacher accounts." },
          { status: 400 }
        );
      }
      const result = await prisma.$transaction(async (tx) => {
        const teacher = await tx.teacher.create({
          data: {
            fullName: fullName.trim(),
            phone: phone.trim(),
            subject: subject.trim(),
            salary: parseFloat(salary),
          },
        });
        const user = await tx.user.create({
          data: {
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            password: hashed,
            role: "TEACHER",
            teacherId: teacher.id,
            forcePasswordChange: true,
          },
          select: {
            id: true, fullName: true, email: true, role: true,
            isActive: true, createdAt: true, teacherId: true,
            teacher: { select: { id: true, fullName: true, subject: true, phone: true, salary: true } },
          },
        });
        return user;
      });
      return NextResponse.json(result, { status: 201 });
    }

    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: hashed,
        role,
      },
      select: {
        id: true, fullName: true, email: true, role: true,
        isActive: true, createdAt: true, teacherId: true, teacher: true,
      },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("[POST /api/users]", error);
    return NextResponse.json(
      { error: "Failed to create user", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
