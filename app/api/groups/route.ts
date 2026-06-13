import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyNewGroup } from "@/lib/telegram";

export async function GET() {
  try {
    const groups = await prisma.group.findMany({
      include: {
        _count: { select: { students: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(groups);
  } catch (error) {
    console.error("[GET /api/groups]", error);
    return NextResponse.json(
      {
        error: "Failed to fetch groups",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const group = await prisma.group.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        monthlyFee: typeof body.monthlyFee === "number" ? body.monthlyFee : 0,
      },
      include: {
        _count: { select: { students: true } },
      },
    });
    notifyNewGroup({ name: group.name, description: group.description });
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("[POST /api/groups]", error);
    return NextResponse.json(
      {
        error: "Failed to create group",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
