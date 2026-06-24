import "server-only";
import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/app/generated/prisma/client";

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string
): Promise<void> {
  try {
    await prisma.notification.create({ data: { userId, type, title, body } });
  } catch (error) {
    console.error("[createNotification]", error);
  }
}
