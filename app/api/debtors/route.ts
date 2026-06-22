import { NextResponse } from "next/server";
import { getDebtors } from "@/lib/debtors";

export async function GET() {
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
