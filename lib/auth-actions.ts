"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSessionCookie } from "@/lib/dal";

export type LoginState = { error?: string } | undefined;

export async function login(
  _state: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  let shouldRedirect = false;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        fullName: true,
        email: true,
        password: true,
        role: true,
        isActive: true,
        teacherId: true,
        forcePasswordChange: true,
      },
    });

    if (!user) {
      return { error: "Invalid email or password." };
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return { error: "Invalid email or password." };
    }

    if (!user.isActive) {
      return { error: "Your account has been deactivated. Contact an administrator." };
    }

    // Log this login attempt
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
      headersList.get("x-real-ip") ??
      null;
    const userAgent = headersList.get("user-agent") ?? null;

    await prisma.loginActivity.create({
      data: { userId: user.id, ipAddress, userAgent },
    });

    await createSession(
      {
        userId: user.id,
        role: user.role,
        fullName: user.fullName,
        email: user.email,
        teacherId: user.teacherId ?? null,
        forcePasswordChange: user.forcePasswordChange,
      },
      { ipAddress, userAgent }
    );

    shouldRedirect = true;
  } catch (err) {
    console.error("[login]", err);
    return { error: "Something went wrong. Please try again." };
  }

  if (shouldRedirect) redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSessionCookie();
  redirect("/login");
}
