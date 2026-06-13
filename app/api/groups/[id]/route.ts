import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const group = await prisma.group.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description ?? null,
        monthlyFee: typeof body.monthlyFee === "number" ? body.monthlyFee : undefined,
      },
      include: {
        _count: { select: { students: true } },
      },
    });
    return NextResponse.json(group);
  } catch (error) {
    console.error("[PUT /api/groups/[id]]", error);
    return NextResponse.json(
      {
        error: "Failed to update group",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.group.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/groups/[id]]", error);
    return NextResponse.json(
      {
        error: "Failed to delete group",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
