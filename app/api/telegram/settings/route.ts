import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.botSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      return NextResponse.json({
        botToken: "",
        adminChatId: "",
        isActive: false,
        hasToken: false,
      });
    }

    // Mask the token — show only the last 6 chars
    const maskedToken =
      settings.botToken.length > 6
        ? "••••••••••" + settings.botToken.slice(-6)
        : settings.botToken;

    return NextResponse.json({
      botToken: maskedToken,
      adminChatId: settings.adminChatId,
      isActive: settings.isActive,
      hasToken: settings.botToken.length > 0,
    });
  } catch (error) {
    console.error("[GET /api/telegram/settings]", error);
    return NextResponse.json(
      { error: "Failed to load settings", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { botToken, adminChatId, isActive } = body as {
      botToken?: string;
      adminChatId?: string;
      isActive?: boolean;
    };

    // If botToken is empty/masked, keep the existing one
    const existing = await prisma.botSettings.findUnique({
      where: { id: "default" },
    });

    const tokenToSave =
      botToken && botToken.trim() && !botToken.startsWith("••")
        ? botToken.trim()
        : existing?.botToken ?? "";

    await prisma.botSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        botToken: tokenToSave,
        adminChatId: (adminChatId ?? "").trim(),
        isActive: isActive ?? false,
      },
      update: {
        botToken: tokenToSave,
        adminChatId: (adminChatId ?? "").trim(),
        isActive: isActive ?? false,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/telegram/settings]", error);
    return NextResponse.json(
      { error: "Failed to save settings", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
