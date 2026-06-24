import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

const BLUE = "FF1E40AF";
const BLUE_LIGHT = "FFDBEAFE";
const WHITE = "FFFFFFFF";
const BORDER_COLOR = "FFE5E7EB";
const ROW_ALT = "FFF8FAFC";

function borderAll(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: "thin", color: { argb: BORDER_COLOR } };
  return { top: side, left: side, bottom: side, right: side };
}

export async function GET() {
  const auth = await requireSession(["ADMIN", "RECEPTION"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const students = await prisma.student.findMany({
      include: { group: { select: { name: true } } },
      orderBy: { fullName: "asc" },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "O'quv Markaz CRM";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Students", {
      views: [{ state: "frozen", ySplit: 3 }],
    });

    // Title rows
    sheet.mergeCells("A1:E1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "O'quv Markaz CRM – Students Report";
    titleCell.font = { bold: true, size: 14, color: { argb: WHITE } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 30;

    sheet.mergeCells("A2:E2");
    const subCell = sheet.getCell("A2");
    subCell.value = `Generated: ${new Date().toLocaleString("en-US")} · Total: ${students.length}`;
    subCell.font = { italic: true, size: 9, color: { argb: "FF6B7280" } };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE_LIGHT } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(2).height = 18;

    // Column headers
    sheet.columns = [
      { key: "no", width: 6 },
      { key: "name", width: 28 },
      { key: "phone", width: 16 },
      { key: "group", width: 22 },
      { key: "joined", width: 16 },
    ];

    const headerRow = sheet.getRow(3);
    headerRow.values = ["#", "Full Name", "Phone", "Group", "Joined Date"];
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: WHITE }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = borderAll();
    });
    headerRow.height = 22;

    // Data rows
    students.forEach((s, i) => {
      const row = sheet.addRow([
        i + 1,
        s.fullName,
        s.phone,
        s.group?.name ?? "No Group",
        new Date(s.createdAt).toLocaleDateString("en-US"),
      ]);
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: i % 2 === 1 ? ROW_ALT : WHITE },
        };
        cell.border = borderAll();
        cell.alignment = { vertical: "middle" };
      });
      row.height = 18;
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="students.xlsx"',
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/students/excel]", error);
    return new Response(JSON.stringify({ error: "Failed to generate Excel" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
