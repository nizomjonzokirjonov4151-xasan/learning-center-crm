import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/dal";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const { fullName, phone, email, isActive, studentIds } = body;

    if (!fullName?.trim() || !phone?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "fullName, phone, and email are required." }, { status: 400 });
    }

    const emailNorm = email.trim().toLowerCase();

    const parent = await prisma.parent.findUnique({ where: { id }, select: { userId: true } });
    if (!parent) return NextResponse.json({ error: "Parent not found." }, { status: 404 });

    // Check email uniqueness (user table)
    const emailConflict = await prisma.user.findFirst({
      where: { email: emailNorm, NOT: { id: parent.userId } },
    });
    if (emailConflict) {
      return NextResponse.json({ error: "Email already in use." }, { status: 409 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: parent.userId },
        data: { fullName: fullName.trim(), email: emailNorm, isActive: isActive ?? true },
      });

      const updated = await tx.parent.update({
        where: { id },
        data: { fullName: fullName.trim(), phone: phone.trim(), email: emailNorm },
        include: {
          user: { select: { id: true, isActive: true, createdAt: true, forcePasswordChange: true } },
          students: {
            select: {
              id: true, fullName: true, phone: true,
              group: { select: { id: true, name: true } },
            },
          },
        },
      });

      // Sync student links: clear previous, set new
      await tx.student.updateMany({ where: { parentId: id }, data: { parentId: null } });
      if (studentIds?.length > 0) {
        await tx.student.updateMany({
          where: { id: { in: studentIds } },
          data: { parentId: id },
        });
      }

      return updated;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[PUT /api/parents/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update parent", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const parent = await prisma.parent.findUnique({ where: { id }, select: { userId: true } });
    if (!parent) return NextResponse.json({ error: "Parent not found." }, { status: 404 });

    // Deleting User cascades to Parent; SetNull handles Student.parentId
    await prisma.user.delete({ where: { id: parent.userId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/parents/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete parent", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
