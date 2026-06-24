import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPdf } from "@/lib/report-pdf";
import { requireSession } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireSession(["ADMIN", "RECEPTION"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const students = await prisma.student.findMany({
      include: { group: { select: { name: true } } },
      orderBy: { fullName: "asc" },
    });

    const active = students.filter((s) => s.groupId).length;

    const buffer = await buildPdf(
      "Students Report",
      [
        { label: "Total Students", value: String(students.length) },
        { label: "Active (In Group)", value: String(active) },
        { label: "Unassigned", value: String(students.length - active) },
      ],
      [
        { label: "#", x: 50, w: 25 },
        { label: "Full Name", x: 75, w: 155 },
        { label: "Phone", x: 230, w: 100 },
        { label: "Group", x: 330, w: 115 },
        { label: "Joined", x: 445, w: 100 },
      ],
      students.map((s, i) => [
        String(i + 1),
        s.fullName,
        s.phone,
        s.group?.name ?? "No Group",
        new Date(s.createdAt).toLocaleDateString("en-US"),
      ])
    );

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="students-report.pdf"',
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/students/pdf]", error);
    return new Response(JSON.stringify({ error: "Failed to generate PDF" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
