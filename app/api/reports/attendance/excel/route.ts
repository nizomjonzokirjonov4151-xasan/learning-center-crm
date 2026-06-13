import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

const BLUE = "FF1E40AF";
const BLUE_LIGHT = "FFDBEAFE";
const WHITE = "FFFFFFFF";
const BORDER_COLOR = "FFE5E7EB";
const ROW_ALT = "FFF8FAFC";
const GREEN = "FF16A34A";
const RED = "FFDC2626";
const AMBER = "FFD97706";

function borderAll(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: "thin", color: { argb: BORDER_COLOR } };
  return { top: side, left: side, bottom: side, right: side };
}

function statusColor(status: string): string {
  if (status === "PRESENT") return GREEN;
  if (status === "ABSENT") return RED;
  return AMBER;
}

export async function GET() {
  try {
    const records = await prisma.attendance.findMany({
      include: {
        student: { select: { fullName: true } },
        group: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 5000,
    });

    const present = records.filter((r) => r.status === "PRESENT").length;
    const absent = records.filter((r) => r.status === "ABSENT").length;
    const late = records.filter((r) => r.status === "LATE").length;
    const total = records.length;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "O'quv Markaz CRM";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Attendance", {
      views: [{ state: "frozen", ySplit: 4 }],
    });

    // Title
    sheet.mergeCells("A1:E1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "O'quv Markaz CRM – Attendance Report";
    titleCell.font = { bold: true, size: 14, color: { argb: WHITE } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 30;

    // Sub-title
    sheet.mergeCells("A2:E2");
    const subCell = sheet.getCell("A2");
    subCell.value = `Generated: ${new Date().toLocaleString("en-US")} · ${total} records shown`;
    subCell.font = { italic: true, size: 9, color: { argb: "FF6B7280" } };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE_LIGHT } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(2).height = 18;

    // Stats row
    sheet.mergeCells("A3:E3");
    const statsCell = sheet.getCell("A3");
    const pct = (n: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : "0%");
    statsCell.value = `Present: ${present} (${pct(present)})   Absent: ${absent} (${pct(absent)})   Late: ${late} (${pct(late)})`;
    statsCell.font = { bold: true, size: 9 };
    statsCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
    statsCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(3).height = 18;

    // Columns
    sheet.columns = [
      { key: "no", width: 6 },
      { key: "student", width: 28 },
      { key: "group", width: 22 },
      { key: "date", width: 16 },
      { key: "status", width: 12 },
    ];

    const headerRow = sheet.getRow(4);
    headerRow.values = ["#", "Student", "Group", "Date", "Status"];
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: WHITE }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = borderAll();
    });
    headerRow.height = 22;

    records.forEach((r, i) => {
      const row = sheet.addRow([
        i + 1,
        r.student.fullName,
        r.group.name,
        new Date(r.date).toLocaleDateString("en-US"),
        r.status,
      ]);

      row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: i % 2 === 1 ? ROW_ALT : WHITE },
        };
        cell.border = borderAll();
        cell.alignment = { vertical: "middle" };

        if (colIdx === 5) {
          cell.font = { bold: true, color: { argb: statusColor(r.status) } };
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }
      });
      row.height = 18;
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="attendance.xlsx"',
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/attendance/excel]", error);
    return new Response(JSON.stringify({ error: "Failed to generate Excel" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
