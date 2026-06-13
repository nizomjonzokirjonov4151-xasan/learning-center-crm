import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

const BLUE = "FF1E40AF";
const BLUE_LIGHT = "FFDBEAFE";
const WHITE = "FFFFFFFF";
const BORDER_COLOR = "FFE5E7EB";
const ROW_ALT = "FFF8FAFC";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function borderAll(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: "thin", color: { argb: BORDER_COLOR } };
  return { top: side, left: side, bottom: side, right: side };
}

export async function GET() {
  try {
    const payments = await prisma.payment.findMany({
      include: { student: { select: { fullName: true } } },
      orderBy: { paymentDate: "desc" },
    });

    const total = payments.reduce((s, p) => s + p.amount, 0);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "O'quv Markaz CRM";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Payments", {
      views: [{ state: "frozen", ySplit: 3 }],
    });

    sheet.mergeCells("A1:G1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "O'quv Markaz CRM – Payments Report";
    titleCell.font = { bold: true, size: 14, color: { argb: WHITE } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 30;

    sheet.mergeCells("A2:G2");
    const subCell = sheet.getCell("A2");
    subCell.value = `Generated: ${new Date().toLocaleString("en-US")} · ${payments.length} payments · Total: ${new Intl.NumberFormat("en-US").format(Math.round(total))} UZS`;
    subCell.font = { italic: true, size: 9, color: { argb: "FF6B7280" } };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE_LIGHT } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(2).height = 18;

    sheet.columns = [
      { key: "no", width: 6 },
      { key: "student", width: 28 },
      { key: "amount", width: 18 },
      { key: "period", width: 20 },
      { key: "date", width: 16 },
      { key: "note", width: 25 },
    ];

    const headerRow = sheet.getRow(3);
    headerRow.values = ["#", "Student", "Amount (UZS)", "Period", "Payment Date", "Note"];
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: WHITE }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = borderAll();
    });
    headerRow.height = 22;

    payments.forEach((p, i) => {
      const row = sheet.addRow([
        i + 1,
        p.student.fullName,
        p.amount,
        `${MONTHS[p.month - 1]} ${p.year}`,
        new Date(p.paymentDate).toLocaleDateString("en-US"),
        p.note ?? "",
      ]);

      row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: i % 2 === 1 ? ROW_ALT : WHITE },
        };
        cell.border = borderAll();
        cell.alignment = { vertical: "middle" };

        if (colIdx === 3) {
          cell.numFmt = '#,##0';
          cell.alignment = { vertical: "middle", horizontal: "right" };
        }
      });
      row.height = 18;
    });

    // Total row
    const totalRow = sheet.addRow(["", "TOTAL", total, "", "", ""]);
    totalRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE_LIGHT } };
      cell.border = borderAll();
      if (colIdx === 3) {
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: "right" };
      }
    });
    totalRow.height = 20;

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="payments.xlsx"',
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/payments/excel]", error);
    return new Response(JSON.stringify({ error: "Failed to generate Excel" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
