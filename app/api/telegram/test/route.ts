import { NextResponse } from "next/server";
import { testConnection } from "@/lib/telegram";
import { requireSession } from "@/lib/api-auth";

export async function POST(request: Request) {
  const auth = await requireSession(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const { token, chatId } = (await request.json()) as {
      token?: string;
      chatId?: string;
    };

    if (!token || !chatId) {
      return NextResponse.json(
        { ok: false, error: "Bot token and Chat ID are required" },
        { status: 400 }
      );
    }

    const result = await testConnection(token.trim(), chatId.trim());
    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/telegram/test]", error);
    return NextResponse.json(
      { ok: false, error: "Internal error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
