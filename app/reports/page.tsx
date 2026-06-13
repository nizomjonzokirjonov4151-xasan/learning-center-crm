"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type DownloadStatus = "idle" | "loading" | "success" | "error";

type ReportCard = {
  key: string;
  title: string;
  description: string;
  url: string;
  filename: string;
  icon: React.ReactNode;
  badge?: string;
};

// ── Icons ─────────────────────────────────────────────────────────────────────

const icons = {
  users: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  ),
  teacher: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
    </svg>
  ),
  folder: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25A2.25 2.25 0 0 0 4.5 16.5h15a2.25 2.25 0 0 0 2.25-2.25V8.25A2.25 2.25 0 0 0 19.5 6h-5.69a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  ),
  payment: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
    </svg>
  ),
  attendance: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
    </svg>
  ),
  download: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
  spinner: (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
};

// ── Report definitions ────────────────────────────────────────────────────────

const PDF_REPORTS: ReportCard[] = [
  {
    key: "pdf-students",
    title: "Students Report",
    description: "All students with name, phone, group, and enrollment date.",
    url: "/api/reports/students/pdf",
    filename: "students-report.pdf",
    icon: icons.users,
  },
  {
    key: "pdf-teachers",
    title: "Teachers Report",
    description: "All teachers with subject, salary, and active status.",
    url: "/api/reports/teachers/pdf",
    filename: "teachers-report.pdf",
    icon: icons.teacher,
  },
  {
    key: "pdf-groups",
    title: "Groups Report",
    description: "All groups with description and enrolled student count.",
    url: "/api/reports/groups/pdf",
    filename: "groups-report.pdf",
    icon: icons.folder,
  },
  {
    key: "pdf-payments",
    title: "Payments Report",
    description: "Full payment history with amounts, periods, and student names.",
    url: "/api/reports/payments/pdf",
    filename: "payments-report.pdf",
    icon: icons.payment,
  },
  {
    key: "pdf-attendance",
    title: "Attendance Report",
    description: "Latest 500 attendance records with present / absent / late status.",
    url: "/api/reports/attendance/pdf",
    filename: "attendance-report.pdf",
    icon: icons.attendance,
    badge: "Latest 500",
  },
];

const EXCEL_REPORTS: ReportCard[] = [
  {
    key: "xl-students",
    title: "Students",
    description: "Full student list with group assignments, exportable for analysis.",
    url: "/api/reports/students/excel",
    filename: "students.xlsx",
    icon: icons.users,
  },
  {
    key: "xl-teachers",
    title: "Teachers",
    description: "Teacher roster with salary figures and status flags.",
    url: "/api/reports/teachers/excel",
    filename: "teachers.xlsx",
    icon: icons.teacher,
  },
  {
    key: "xl-payments",
    title: "Payments",
    description: "Payment history with auto-summed total row at the bottom.",
    url: "/api/reports/payments/excel",
    filename: "payments.xlsx",
    icon: icons.payment,
  },
  {
    key: "xl-attendance",
    title: "Attendance",
    description: "Up to 5,000 attendance records with color-coded status column.",
    url: "/api/reports/attendance/excel",
    filename: "attendance.xlsx",
    icon: icons.attendance,
    badge: "Up to 5,000",
  },
];

// ── Download card ─────────────────────────────────────────────────────────────

function DownloadCard({
  card,
  status,
  type,
  onDownload,
}: {
  card: ReportCard;
  status: DownloadStatus;
  type: "pdf" | "excel";
  onDownload: (card: ReportCard) => void;
}) {
  const isPdf = type === "pdf";
  const accent = isPdf ? "text-red-600" : "text-green-600";
  const accentBg = isPdf ? "bg-red-50" : "bg-green-50";
  const accentBorder = isPdf ? "border-red-100" : "border-green-100";
  const btnBase = isPdf
    ? "bg-red-600 hover:bg-red-700 text-white"
    : "bg-green-600 hover:bg-green-700 text-white";

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow`}>
      {/* Icon + title */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${accentBg} border ${accentBorder} flex items-center justify-center flex-shrink-0 ${accent}`}>
          {card.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-gray-900">{card.title}</h3>
            {card.badge && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {card.badge}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{card.description}</p>
        </div>
      </div>

      {/* Format label */}
      <div className="flex items-center gap-1.5">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${accentBg} ${accent} border ${accentBorder}`}>
          {isPdf ? "PDF" : "XLSX"}
        </span>
        <span className="text-xs text-gray-400">· Generated on demand · Real-time data</span>
      </div>

      {/* Download button */}
      <button
        onClick={() => onDownload(card)}
        disabled={status === "loading"}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
          status === "success"
            ? "bg-emerald-500 text-white"
            : status === "error"
            ? "bg-red-500 text-white"
            : btnBase
        }`}
      >
        {status === "idle" && (
          <>
            {icons.download}
            Download {isPdf ? "PDF" : "Excel"}
          </>
        )}
        {status === "loading" && (
          <>
            {icons.spinner}
            Generating…
          </>
        )}
        {status === "success" && (
          <>
            {icons.check}
            Downloaded!
          </>
        )}
        {status === "error" && (
          <>
            {icons.error}
            Failed — Retry
          </>
        )}
      </button>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  subtitle,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            {badge}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [statuses, setStatuses] = useState<Record<string, DownloadStatus>>({});

  function setStatus(key: string, s: DownloadStatus) {
    setStatuses((prev) => ({ ...prev, [key]: s }));
  }

  async function handleDownload(card: ReportCard) {
    setStatus(card.key, "loading");
    try {
      const res = await fetch(card.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = card.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus(card.key, "success");
      setTimeout(() => setStatus(card.key, "idle"), 3000);
    } catch (err) {
      console.error("Download failed:", err);
      setStatus(card.key, "error");
      setTimeout(() => setStatus(card.key, "idle"), 4000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="mt-1 text-sm text-gray-500">
              Download formatted PDF and Excel reports with real-time data from your CRM.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
            <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 8 8">
              <circle cx="4" cy="4" r="3" />
            </svg>
            Reports generated on demand
          </div>
        </div>

        {/* ── Info banner ──────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4 text-blue-800">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          <div className="text-sm">
            <p className="font-semibold">Live data reports</p>
            <p className="text-blue-700 mt-0.5">
              Each download fetches the latest data from the database at the moment you click. Reports are not cached.
            </p>
          </div>
        </div>

        {/* ── PDF Reports ─────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <SectionHeader
            badge={`${PDF_REPORTS.length} reports`}
            title="PDF Reports"
            subtitle="Formatted documents ready for printing, sharing, and archiving."
            icon={
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PDF_REPORTS.map((card) => (
              <DownloadCard
                key={card.key}
                card={card}
                type="pdf"
                status={statuses[card.key] ?? "idle"}
                onDownload={handleDownload}
              />
            ))}
          </div>
        </section>

        {/* ── Divider ─────────────────────────────────────────────────────── */}
        <div className="border-t border-gray-200" />

        {/* ── Excel Reports ────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <SectionHeader
            badge={`${EXCEL_REPORTS.length} exports`}
            title="Excel Exports"
            subtitle="Structured spreadsheets with styled headers, frozen rows, and totals — open in Excel or Google Sheets."
            icon={
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0 1 18 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0 1 18 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 0 1 6 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M7.125 15l3.375 3.375M7.125 18.375 10.5 15m6.375-5.25v-.75A1.125 1.125 0 0 0 15.75 7.875h-.75M10.5 8.625v-.75A1.125 1.125 0 0 0 9.375 6.75h-.75M7.125 12H6.75a1.125 1.125 0 0 0-1.125 1.125v.75m12.375-1.875h.75a1.125 1.125 0 0 1 1.125 1.125v.75" />
              </svg>
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {EXCEL_REPORTS.map((card) => (
              <DownloadCard
                key={card.key}
                card={card}
                type="excel"
                status={statuses[card.key] ?? "idle"}
                onDownload={handleDownload}
              />
            ))}
          </div>
        </section>

        {/* ── Quick download all ───────────────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Download All Reports</h3>
              <p className="text-xs text-gray-500 mt-1">
                Queue all {PDF_REPORTS.length + EXCEL_REPORTS.length} downloads at once. Browsers may ask for permission to download multiple files.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => PDF_REPORTS.forEach((c) => handleDownload(c))}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {icons.download}
                All PDFs
              </button>
              <button
                onClick={() => EXCEL_REPORTS.forEach((c) => handleDownload(c))}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {icons.download}
                All Excel
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
