import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const count = await prisma.user.count();
    return NextResponse.json({ needsSetup: count === 0 });
  } catch {
    return NextResponse.json({ needsSetup: false });
  }
}

export async function POST(request: Request) {
  try {
    const count = await prisma.user.count();
    if (count > 0) {
      return NextResponse.json(
        { error: "Setup already completed. An admin account already exists." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { fullName, email, password } = body;

    if (!fullName?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "fullName, email, and password are required." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: hashed,
        role: "ADMIN",
      },
      select: { id: true, fullName: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/auth/setup]", error);
    return NextResponse.json(
      { error: "Failed to create admin account." },
      { status: 500 }
    );
  }
}
