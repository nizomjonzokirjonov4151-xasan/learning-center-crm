import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

const BLUE = "FF1E40AF";
const BLUE_LIGHT = "FFDBEAFE";
const WHITE = "FFFFFFFF";
const BORDER_COLOR = "FFE5E7EB";
const ROW_ALT = "FFF8FAFC";
const GREEN = "FF16A34A";
const RED = "FFDC2626";
const VIOLET = "FF7C3AED";
const VIOLET_LIGHT = "FFEDE9FE";

function borderAll(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: "thin", color: { argb: BORDER_COLOR } };
  return { top: side, left: side, bottom: side, right: side };
}

export async function GET() {
  const auth = await requireSession(["ADMIN", "RECEPTION", "ACCOUNTANT"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

    const teachers = await prisma.teacher.findMany({
      orderBy: { fullName: "asc" },
      include: {
        groups: {
          select: {
            id: true,
            name: true,
            teacherPercent: true,
            _count: { select: { students: true } },
            students: {
              select: {
                payments: {
                  where: { month: currentMonth, year: currentYear },
                  select: { amount: true },
                },
              },
            },
          },
          orderBy: { name: "asc" },
        },
      },
    });

    const active = teachers.filter((t) => t.isActive).length;

    type EnrichedGroup = {
      id: string;
      name: string;
      teacherPercent: number;
      studentCount: number;
      revenue: number;
      earnedSalary: number;
    };

    const enriched = teachers.map((t) => {
      const groups: EnrichedGroup[] = t.groups.map((g) => {
        const revenue = g.students.reduce(
          (sum, s) => sum + s.payments.reduce((ps, p) => ps + p.amount, 0),
          0
        );
        return {
          id: g.id,
          name: g.name,
          teacherPercent: g.teacherPercent,
          studentCount: g._count.students,
          revenue,
          earnedSalary: revenue * (g.teacherPercent / 100),
        };
      });
      const totalRevenue = groups.reduce((s, g) => s + g.revenue, 0);
      const totalEarned = groups.reduce((s, g) => s + g.earnedSalary, 0);
      const avgCommission =
        groups.length > 0
          ? Math.round(groups.reduce((s, g) => s + g.teacherPercent, 0) / groups.length)
          : 0;
      return { ...t, groups, groupCount: t.groups.length, avgCommission, totalRevenue, totalEarned };
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "O'quv Markaz CRM";
    workbook.created = now;

    // ── Sheet 1: Teachers overview ──────────────────────────────────────────
    const sheet = workbook.addWorksheet("Teachers", {
      views: [{ state: "frozen", ySplit: 3 }],
    });

    sheet.mergeCells("A1:I1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `O'quv Markaz CRM – Teachers Report — ${monthLabel}`;
    titleCell.font = { bold: true, size: 14, color: { argb: WHITE } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 30;

    sheet.mergeCells("A2:I2");
    const subCell = sheet.getCell("A2");
    subCell.value = `Generated: ${now.toLocaleString("en-US")} · Total: ${teachers.length} · Active: ${active}`;
    subCell.font = { italic: true, size: 9, color: { argb: "FF6B7280" } };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE_LIGHT } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(2).height = 18;

    sheet.columns = [
      { key: "no", width: 5 },
      { key: "name", width: 26 },
      { key: "phone", width: 16 },
      { key: "subject", width: 18 },
      { key: "salary", width: 16 },
      { key: "status", width: 10 },
      { key: "groups", width: 9 },
      { key: "commission", width: 12 },
      { key: "earned", width: 18 },
    ];

    const headerRow = sheet.getRow(3);
    headerRow.values = [
      "#", "Full Name", "Phone", "Subject", "Base Salary (UZS)", "Status",
      "Groups", `Comm%`, `Earned (${now.toLocaleString("en-US", { month: "short" })})`,
    ];
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: WHITE }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = borderAll();
    });
    headerRow.height = 22;

    enriched.forEach((t, i) => {
      const row = sheet.addRow([
        i + 1,
        t.fullName,
        t.phone,
        t.subject,
        t.salaryType === "PERCENTAGE" ? `${t.salaryValue ?? 0}% comm.` : t.salaryValue ?? null,
        t.isActive ? "Active" : "Inactive",
        t.groupCount,
        t.groupCount > 0 ? t.avgCommission / 100 : null,
        t.isActive ? t.totalEarned : null,
      ]);

      row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: i % 2 === 1 ? ROW_ALT : WHITE },
        };
        cell.border = borderAll();
        cell.alignment = { vertical: "middle" };

        if (colIdx === 5) { // Base Salary
          cell.numFmt = '#,##0';
          cell.alignment = { vertical: "middle", horizontal: "right" };
        }
        if (colIdx === 6) { // Status
          cell.font = { bold: true, color: { argb: t.isActive ? GREEN : RED } };
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }
        if (colIdx === 7) { // Groups count
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }
        if (colIdx === 8) { // Commission %
          cell.numFmt = '0%';
          cell.font = { bold: true, color: { argb: VIOLET } };
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }
        if (colIdx === 9) { // Earned
          cell.numFmt = '#,##0';
          cell.font = { bold: true, color: { argb: GREEN } };
          cell.alignment = { vertical: "middle", horizontal: "right" };
        }
      });
      row.height = 18;
    });

    // ── Sheet 2: Commission Breakdown ───────────────────────────────────────
    const sheet2 = workbook.addWorksheet("Commission", {
      views: [{ state: "frozen", ySplit: 3 }],
    });

    sheet2.mergeCells("A1:G1");
    const title2 = sheet2.getCell("A1");
    title2.value = `Commission Breakdown — ${monthLabel}`;
    title2.font = { bold: true, size: 14, color: { argb: WHITE } };
    title2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6D28D9" } };
    title2.alignment = { vertical: "middle", horizontal: "center" };
    sheet2.getRow(1).height = 30;

    sheet2.mergeCells("A2:G2");
    const sub2 = sheet2.getCell("A2");
    sub2.value = `Generated: ${now.toLocaleString("en-US")} · Revenue from actual Payments table`;
    sub2.font = { italic: true, size: 9, color: { argb: "FF6B7280" } };
    sub2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VIOLET_LIGHT } };
    sub2.alignment = { vertical: "middle", horizontal: "center" };
    sheet2.getRow(2).height = 18;

    sheet2.columns = [
      { key: "teacher", width: 26 },
      { key: "status", width: 10 },
      { key: "group", width: 22 },
      { key: "students", width: 10 },
      { key: "commission", width: 14 },
      { key: "revenue", width: 18 },
      { key: "earned", width: 18 },
    ];

    const hdr2 = sheet2.getRow(3);
    hdr2.values = ["Teacher", "Status", "Group", "Students", "Comm%", "Revenue (UZS)", "Earned (UZS)"];
    hdr2.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: WHITE }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6D28D9" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = borderAll();
    });
    hdr2.height = 22;

    let rowIdx = 0;
    enriched.forEach((t) => {
      if (t.groups.length === 0) {
        const row = sheet2.addRow([t.fullName, t.isActive ? "Active" : "Inactive", "—", 0, null, null, null]);
        row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowIdx % 2 === 1 ? ROW_ALT : WHITE } };
          cell.border = borderAll();
          cell.alignment = { vertical: "middle" };
          if (colIdx === 2) cell.font = { bold: true, color: { argb: t.isActive ? GREEN : RED } };
        });
        row.height = 18;
        rowIdx++;
        return;
      }

      t.groups.forEach((g, gi) => {
        const row = sheet2.addRow([
          gi === 0 ? t.fullName : "",
          gi === 0 ? (t.isActive ? "Active" : "Inactive") : "",
          g.name,
          g.studentCount,
          g.teacherPercent / 100,
          g.revenue,
          g.earnedSalary,
        ]);
        row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowIdx % 2 === 1 ? ROW_ALT : WHITE } };
          cell.border = borderAll();
          cell.alignment = { vertical: "middle" };
          if (colIdx === 2 && gi === 0) cell.font = { bold: true, color: { argb: t.isActive ? GREEN : RED } };
          if (colIdx === 4) { cell.numFmt = "0%"; cell.alignment = { vertical: "middle", horizontal: "center" }; cell.font = { color: { argb: VIOLET } }; }
          if (colIdx === 6) { cell.numFmt = "#,##0"; cell.alignment = { vertical: "middle", horizontal: "right" }; }
          if (colIdx === 7) { cell.numFmt = "#,##0"; cell.font = { bold: true, color: { argb: GREEN } }; cell.alignment = { vertical: "middle", horizontal: "right" }; }
        });
        row.height = 18;
        rowIdx++;
      });
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
