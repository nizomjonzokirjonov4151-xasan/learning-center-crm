import { prisma } from "@/lib/prisma";
import { buildPdf } from "@/lib/report-pdf";

export async function GET() {
  try {
    const teachers = await prisma.teacher.findMany({ orderBy: { fullName: "asc" } });

    const active = teachers.filter((t) => t.isActive).length;
    const totalSalary = teachers.filter((t) => t.isActive).reduce((s, t) => s + t.salary, 0);

    const buffer = await buildPdf(
      "Teachers Report",
      [
        { label: "Total Teachers", value: String(teachers.length) },
        { label: "Active", value: String(active) },
        { label: "Inactive", value: String(teachers.length - active) },
        {
          label: "Monthly Payroll (Active)",
          value: new Intl.NumberFormat("en-US").format(totalSalary) + " UZS",
        },
      ],
      [
        { label: "#", x: 50, w: 25 },
        { label: "Full Name", x: 75, w: 135 },
        { label: "Phone", x: 210, w: 100 },
        { label: "Subject", x: 310, w: 100 },
        { label: "Salary (UZS)", x: 410, w: 80 },
        { label: "Status", x: 490, w: 55 },
      ],
      teachers.map((t, i) => [
        String(i + 1),
        t.fullName,
        t.phone,
        t.subject,
        new Intl.NumberFormat("en-US").format(t.salary),
        t.isActive ? "Active" : "Inactive",
      ])
    );

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="teachers-report.pdf"',
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/teachers/pdf]", error);
    return new Response(JSON.stringify({ error: "Failed to generate PDF" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
