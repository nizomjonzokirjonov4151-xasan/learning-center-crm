import { NextResponse } from "next/server";
import { getDebtors } from "@/lib/debtors";
import { requireSession } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireSession(["ADMIN", "RECEPTION", "ACCOUNTANT"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const debtors = await getDebtors();
    return NextResponse.json(debtors);
  } catch (error) {
    console.error("[GET /api/debtors]", error);
    return NextResponse.json(
      { error: "Failed to fetch debtors", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
