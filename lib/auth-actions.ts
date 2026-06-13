"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionCookie, deleteSessionCookie } from "@/lib/dal";

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

    await createSessionCookie({
      userId: user.id,
      role: user.role,
      fullName: user.fullName,
      email: user.email,
      teacherId: user.teacherId ?? null,
    });

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
