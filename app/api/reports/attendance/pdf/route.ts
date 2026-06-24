import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPdf } from "@/lib/report-pdf";
import { requireSession } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireSession(["ADMIN", "RECEPTION"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const records = await prisma.attendance.findMany({
      include: {
        student: { select: { fullName: true } },
        group: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 500, // cap to keep PDF manageable
    });

    const present = records.filter((r) => r.status === "PRESENT").length;
    const absent = records.filter((r) => r.status === "ABSENT").length;
    const late = records.filter((r) => r.status === "LATE").length;
    const total = records.length;

    const buffer = await buildPdf(
      "Attendance Report",
      [
        { label: "Records Shown", value: `${total}${total === 500 ? " (latest 500)" : ""}` },
        { label: "Present", value: `${present} (${total > 0 ? Math.round((present / total) * 100) : 0}%)` },
        { label: "Absent", value: `${absent} (${total > 0 ? Math.round((absent / total) * 100) : 0}%)` },
        { label: "Late", value: `${late} (${total > 0 ? Math.round((late / total) * 100) : 0}%)` },
      ],
      [
        { label: "#", x: 50, w: 25 },
        { label: "Student", x: 75, w: 150 },
        { label: "Group", x: 225, w: 120 },
        { label: "Date", x: 345, w: 100 },
        { label: "Status", x: 445, w: 100 },
      ],
      records.map((r, i) => [
        String(i + 1),
        r.student.fullName,
        r.group.name,
        new Date(r.date).toLocaleDateString("en-US"),
        r.status,
      ])
    );

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="attendance-report.pdf"',
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/attendance/pdf]", error);
    return new Response(JSON.stringify({ error: "Failed to generate PDF" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
