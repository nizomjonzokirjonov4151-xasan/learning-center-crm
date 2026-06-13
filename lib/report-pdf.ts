import PDFDocument from "pdfkit";

export type PdfCol = { label: string; x: number; w: number };
export type SummaryItem = { label: string; value: string };

const M = 50;       // margin
const CW = 495;     // content width (A4: 595 - 2*50)
const ROW_H = 17;   // row height in points
const PAGE_H = 841; // A4 height in points
const BOTTOM = PAGE_H - M;

const C = {
  blue: "#1e40af",
  blueMid: "#3b82f6",
  blueLight: "#dbeafe",
  text: "#374151",
  muted: "#6b7280",
  rowAlt: "#f8fafc",
  line: "#e5e7eb",
  summaryBg: "#f0f9ff",
  summaryBorder: "#bae6fd",
  greenLight: "#dcfce7",
  greenBorder: "#86efac",
};

function hline(doc: PDFKit.PDFDocument, y: number, color = C.line, width = 0.4) {
  doc.moveTo(M, y).lineTo(M + CW, y).strokeColor(color).lineWidth(width).stroke();
}

function pageHeader(doc: PDFKit.PDFDocument, title: string): number {
  const dateStr = new Date().toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });

  let y = M;
  doc.font("Helvetica-Bold").fontSize(20).fillColor(C.blue).text("O'quv Markaz CRM", M, y);
  y += 27;
  doc.font("Helvetica").fontSize(13).fillColor(C.text).text(title, M, y);
  y += 19;
  doc.font("Helvetica").fontSize(8).fillColor(C.muted).text(`Generated: ${dateStr}`, M, y);
  y += 15;
  hline(doc, y, C.line, 1);
  y += 12;
  return y;
}

function drawSummary(doc: PDFKit.PDFDocument, items: SummaryItem[], y: number): number {
  const h = items.length * 17 + 10;
  doc.rect(M, y, CW, h).fillAndStroke(C.summaryBg, C.summaryBorder);
  let cy = y + 7;
  items.forEach(({ label, value }) => {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(C.text).text(label + ":", M + 10, cy, { width: 160 });
    doc.font("Helvetica").fontSize(9).fillColor(C.blue).text(value, M + 175, cy, { width: CW - 185 });
    cy += 17;
  });
  return y + h + 12;
}

function drawColHeaders(doc: PDFKit.PDFDocument, cols: PdfCol[], y: number): number {
  doc.rect(M, y, CW, ROW_H).fill(C.blueLight);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.blue);
  cols.forEach(({ label, x, w }) => {
    doc.text(label, x, y + 4, { width: w, ellipsis: true });
  });
  const endY = y + ROW_H + 1;
  hline(doc, endY, "#93c5fd", 0.5);
  return endY + 2;
}

function drawDataRow(
  doc: PDFKit.PDFDocument,
  cols: PdfCol[],
  values: string[],
  rowIdx: number,
  y: number
): number {
  if (rowIdx % 2 === 1) {
    doc.rect(M, y, CW, ROW_H).fill(C.rowAlt);
  }
  doc.font("Helvetica").fontSize(8).fillColor(C.text);
  cols.forEach(({ x, w }, ci) => {
    doc.text(values[ci] ?? "—", x, y + 4, { width: w, ellipsis: true });
  });
  const endY = y + ROW_H;
  hline(doc, endY);
  return endY;
}

export function buildPdf(
  title: string,
  summary: SummaryItem[],
  cols: PdfCol[],
  rows: string[][]
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: M, size: "A4", autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => {
      const buf = Buffer.concat(chunks);
      resolve(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    });
    doc.on("error", reject);

    let y = pageHeader(doc, title);
    y = drawSummary(doc, summary, y);
    y += 6;

    if (rows.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor(C.muted)
        .text("No records found.", M, y + 24, { width: CW, align: "center" });
    } else {
      y = drawColHeaders(doc, cols, y);
      rows.forEach((row, i) => {
        if (y + ROW_H > BOTTOM - 20) {
          doc.addPage();
          y = M;
          y = drawColHeaders(doc, cols, y);
        }
        y = drawDataRow(doc, cols, row, i, y);
      });
    }

    doc.end();
  });
}
