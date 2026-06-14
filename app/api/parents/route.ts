import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/dal";

export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const parents = await prisma.parent.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, isActive: true, createdAt: true, forcePasswordChange: true } },
        students: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            group: { select: { id: true, name: true } },
          },
        },
      },
    });
    return NextResponse.json(parents);
  } catch (error) {
    console.error("[GET /api/parents]", error);
    return NextResponse.json({ error: "Failed to fetch parents" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { fullName, phone, email, password, studentIds } = body;

    if (!fullName?.trim() || !phone?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: "fullName, phone, email, and password are required." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const emailNorm = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: fullName.trim(),
          email: emailNorm,
          password: hashed,
          role: "PARENT",
          forcePasswordChange: true,
        },
      });

      const parent = await tx.parent.create({
        data: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: emailNorm,
          userId: user.id,
        },
        include: {
          user: { select: { id: true, isActive: true, createdAt: true, forcePasswordChange: true } },
          students: {
            select: {
              id: true, fullName: true, phone: true,
              group: { select: { id: true, name: true } },
            },
          },
        },
      });

      // Link students if provided
      if (studentIds?.length > 0) {
        await tx.student.updateMany({
          where: { id: { in: studentIds } },
          data: { parentId: parent.id },
        });
      }

      return parent;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[POST /api/parents]", error);
    return NextResponse.json(
      { error: "Failed to create parent", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
