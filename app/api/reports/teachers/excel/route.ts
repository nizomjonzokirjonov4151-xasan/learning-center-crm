import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

const BLUE = "FF1E40AF";
const BLUE_LIGHT = "FFDBEAFE";
const WHITE = "FFFFFFFF";
const BORDER_COLOR = "FFE5E7EB";
const ROW_ALT = "FFF8FAFC";
const GREEN = "FF16A34A";
const RED = "FFDC2626";

function borderAll(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: "thin", color: { argb: BORDER_COLOR } };
  return { top: side, left: side, bottom: side, right: side };
}

export async function GET() {
  try {
    const teachers = await prisma.teacher.findMany({ orderBy: { fullName: "asc" } });
    const active = teachers.filter((t) => t.isActive).length;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "O'quv Markaz CRM";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Teachers", {
      views: [{ state: "frozen", ySplit: 3 }],
    });

    sheet.mergeCells("A1:F1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "O'quv Markaz CRM – Teachers Report";
    titleCell.font = { bold: true, size: 14, color: { argb: WHITE } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 30;

    sheet.mergeCells("A2:F2");
    const subCell = sheet.getCell("A2");
    subCell.value = `Generated: ${new Date().toLocaleString("en-US")} · Total: ${teachers.length} · Active: ${active}`;
    subCell.font = { italic: true, size: 9, color: { argb: "FF6B7280" } };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE_LIGHT } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(2).height = 18;

    sheet.columns = [
      { key: "no", width: 6 },
      { key: "name", width: 28 },
      { key: "phone", width: 16 },
      { key: "subject", width: 20 },
      { key: "salary", width: 18 },
      { key: "status", width: 12 },
    ];

    const headerRow = sheet.getRow(3);
    headerRow.values = ["#", "Full Name", "Phone", "Subject", "Salary (UZS)", "Status"];
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: WHITE }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = borderAll();
    });
    headerRow.height = 22;

    teachers.forEach((t, i) => {
      const row = sheet.addRow([
        i + 1,
        t.fullName,
        t.phone,
        t.subject,
        t.salary,
        t.isActive ? "Active" : "Inactive",
      ]);

      row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: i % 2 === 1 ? ROW_ALT : WHITE },
        };
        cell.border = borderAll();
        cell.alignment = { vertical: "middle" };

        // Salary column: number format
        if (colIdx === 5) {
          cell.numFmt = '#,##0';
          cell.alignment = { vertical: "middle", horizontal: "right" };
        }
        // Status column: color
        if (colIdx === 6) {
          cell.font = { bold: true, color: { argb: t.isActive ? GREEN : RED } };
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }
      });
      row.height = 18;
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="teachers.xlsx"',
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/teachers/excel]", error);
    return new Response(JSON.stringify({ error: "Failed to generate Excel" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
