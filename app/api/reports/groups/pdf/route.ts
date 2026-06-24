import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPdf } from "@/lib/report-pdf";
import { requireSession } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireSession(["ADMIN", "RECEPTION"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const groups = await prisma.group.findMany({
      include: { _count: { select: { students: true } } },
      orderBy: { name: "asc" },
    });

    const totalStudents = groups.reduce((s, g) => s + g._count.students, 0);

    const buffer = await buildPdf(
      "Groups Report",
      [
        { label: "Total Groups", value: String(groups.length) },
        { label: "Total Students Enrolled", value: String(totalStudents) },
        {
          label: "Average Group Size",
          value:
            groups.length > 0
              ? (totalStudents / groups.length).toFixed(1)
              : "0",
        },
      ],
      [
        { label: "#", x: 50, w: 25 },
        { label: "Group Name", x: 75, w: 145 },
        { label: "Description", x: 220, w: 175 },
        { label: "Students", x: 395, w: 60 },
        { label: "Created", x: 455, w: 90 },
      ],
      groups.map((g, i) => [
        String(i + 1),
        g.name,
        g.description ?? "—",
        String(g._count.students),
        new Date(g.createdAt).toLocaleDateString("en-US"),
      ])
    );

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="groups-report.pdf"',
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/groups/pdf]", error);
    return new Response(JSON.stringify({ error: "Failed to generate PDF" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
