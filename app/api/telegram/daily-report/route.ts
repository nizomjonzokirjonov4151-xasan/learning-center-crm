import { NextResponse } from "next/server";
import { sendDailyReport } from "@/lib/telegram";
import { requireSession } from "@/lib/api-auth";

export async function POST() {
  const auth = await requireSession(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const ok = await sendDailyReport();
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "Failed to send report. Check that the bot is active and settings are saved." },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/telegram/daily-report]", error);
    return NextResponse.json(
      { ok: false, error: "Internal error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
