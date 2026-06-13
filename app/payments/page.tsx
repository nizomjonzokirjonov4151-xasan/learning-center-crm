"use client";

import { useState, useEffect, useCallback } from "react";

type Student = { id: string; fullName: string; phone: string; groupId: string | null };

type Payment = {
  id: string;
  studentId: string;
  amount: number;
  paymentDate: string;
  month: number;
  year: number;
  note: string | null;
  createdAt: string;
  student: { id: string; fullName: string; phone: string };
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatAmount(n: number) {
  return new Intl.NumberFormat("en-US").format(n) + " UZS";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMonth(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function currentMonthYear() {
  const d = new Date();
  return `${d.getMonth() + 1}-${d.getFullYear()}`;
}

function getMonthOptions() {
  const opts: { value: string; label: string; month: number; year: number }[] = [];
  const now = new Date();
  for (let offset = -2; offset <= 12; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    opts.push({
      value: `${d.getMonth() + 1}-${d.getFullYear()}`,
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    });
  }
  return opts;
}

const MONTH_OPTIONS = getMonthOptions();

function parseMonthYear(value: string): { month: number; year: number } {
  const [m, y] = value.split("-");
  return { month: parseInt(m), year: parseInt(y) };
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Spinner({ size = "sm" }: { size?: "sm" | "md" }) {
  const sz = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <svg className={`animate-spin ${sz}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function ErrorPill({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

function Backdrop({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function ModalCard({ onClick, children }: { onClick: (e: React.MouseEvent) => void; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={onClick}>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none";
const selectCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";
const primaryBtnCls =
  "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors";
const ghostBtnCls =
  "inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

// ── Student Profile Card ─────────────────────────────────────────────────────

function StudentProfileCard({
  student,
  payments,
  loading,
}: {
  student: Student | undefined;
  payments: Payment[];
  loading: boolean;
}) {
  if (!student) return null;
  const total = payments.reduce((s, p) => s + p.amount, 0);
  const last = payments[0];
  const monthsPaid = Array.from(new Set(payments.map((p) => `${p.month}-${p.year}`))).slice(0, 6);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {student.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-white text-sm">{student.fullName}</p>
          <p className="text-blue-200 text-xs mt-0.5">{student.phone}</p>
        </div>
      </div>
      <div className="p-5 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Spinner /> Loading…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 py-3">
                <p className="text-lg font-bold text-emerald-900">
                  {new Intl.NumberFormat("en-US").format(total)}
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">Total (UZS)</p>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-100 py-3">
                <p className="text-lg font-bold text-blue-900">{payments.length}</p>
                <p className="text-xs text-blue-600 mt-0.5">Payments</p>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-100 py-3">
                <p className="text-sm font-bold text-gray-900 leading-tight">
                  {last ? formatDate(last.paymentDate) : "—"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Last Paid</p>
              </div>
            </div>
            {monthsPaid.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Months Paid
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {monthsPaid.map((mv) => {
                    const { month, year } = parseMonthYear(mv);
                    return (
                      <span
                        key={mv}
                        className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                      >
                        {new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<"add" | "history">("add");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  // ── Add Payment form ────────────────────────────────────────────────────
  const [formStudentId, setFormStudentId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formMonthYear, setFormMonthYear] = useState(currentMonthYear);
  const [formDate, setFormDate] = useState(todayISO);
  const [formNote, setFormNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  // student summary for add tab
  const [studentPayments, setStudentPayments] = useState<Payment[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // ── History ─────────────────────────────────────────────────────────────
  const [histStudentId, setHistStudentId] = useState("");
  const [histMonthYear, setHistMonthYear] = useState("");
  const [histRecords, setHistRecords] = useState<Payment[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState<string | null>(null);

  // ── Edit modal ──────────────────────────────────────────────────────────
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editMonthYear, setEditMonthYear] = useState(currentMonthYear);
  const [editDate, setEditDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // ── Delete ──────────────────────────────────────────────────────────────
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Load students ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then(setStudents)
      .catch(console.error)
      .finally(() => setStudentsLoading(false));
  }, []);

  // ── Load student payments for add-tab summary ────────────────────────────
  useEffect(() => {
    if (!formStudentId) {
      setStudentPayments([]);
      return;
    }
    let cancelled = false;
    setSummaryLoading(true);
    fetch(`/api/payments?studentId=${formStudentId}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setStudentPayments(data); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setSummaryLoading(false); });
    return () => { cancelled = true; };
  }, [formStudentId]);

  // ── Escape key closes modals ─────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setEditingPayment(null);
      setDeleteConfirmId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Fetch history ────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setHistLoading(true);
    setHistError(null);
    try {
      const params = new URLSearchParams();
      if (histStudentId) params.set("studentId", histStudentId);
      if (histMonthYear) {
        const { month, year } = parseMonthYear(histMonthYear);
        params.set("month", String(month));
        params.set("year", String(year));
      }
      const res = await fetch(`/api/payments?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setHistRecords(await res.json());
    } catch (e) {
      setHistError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setHistLoading(false);
    }
  }, [histStudentId, histMonthYear]);

  useEffect(() => {
    if (activeTab === "history") fetchHistory();
  }, [activeTab, fetchHistory]);

  // ── Add payment ──────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!formStudentId || !formAmount) return;
    setAdding(true);
    setAddError(null);
    setAddSuccess(false);
    try {
      const { month, year } = parseMonthYear(formMonthYear);
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: formStudentId,
          amount: formAmount,
          paymentDate: formDate,
          month,
          year,
          note: formNote,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? data.error ?? `HTTP ${res.status}`);
      }
      setFormAmount("");
      setFormNote("");
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 3000);
      // reload summary
      const updated = await fetch(`/api/payments?studentId=${formStudentId}`).then((r) => r.json());
      setStudentPayments(updated);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to add payment");
    } finally {
      setAdding(false);
    }
  }

  // ── Edit payment ─────────────────────────────────────────────────────────
  function openEdit(p: Payment) {
    setEditingPayment(p);
    setEditAmount(String(p.amount));
    setEditMonthYear(`${p.month}-${p.year}`);
    setEditDate(p.paymentDate.slice(0, 10));
    setEditNote(p.note ?? "");
    setEditError(null);
  }

  function closeEdit() {
    setEditingPayment(null);
    setEditError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPayment) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const { month, year } = parseMonthYear(editMonthYear);
      const res = await fetch(`/api/payments/${editingPayment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: editAmount,
          paymentDate: editDate,
          month,
          year,
          note: editNote,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? data.error ?? `HTTP ${res.status}`);
      }
      const updated: Payment = await res.json();
      setHistRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      closeEdit();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setEditSaving(false);
    }
  }

  // ── Delete payment ───────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteConfirmId(null);
    try {
      await fetch(`/api/payments/${id}`, { method: "DELETE" });
      setHistRecords((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const formStudent = students.find((s) => s.id === formStudentId);
  const histStudent = students.find((s) => s.id === histStudentId);
  const deletePayment = histRecords.find((r) => r.id === deleteConfirmId);

  const histTotal = histRecords.reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-10 px-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
            <p className="mt-1 text-sm text-gray-500">
              Record and manage student tuition payments.
            </p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-6">
              {(["add", "history"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    activeTab === tab
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "add" ? "Add Payment" : "History"}
                </button>
              ))}
            </nav>
          </div>

          {/* ── Add Payment Tab ─────────────────────────────────────────── */}
          {activeTab === "add" && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Form */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-base font-semibold text-gray-900 mb-5">
                    Record New Payment
                  </h2>
                  <form onSubmit={handleAdd} className="space-y-4">
                    <div>
                      <label className={labelCls}>
                        Student <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formStudentId}
                        onChange={(e) => setFormStudentId(e.target.value)}
                        required
                        disabled={studentsLoading}
                        className={selectCls}
                      >
                        <option value="">— Select a student —</option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.fullName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>
                          Amount (UZS) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="e.g. 500000"
                          value={formAmount}
                          onChange={(e) => setFormAmount(e.target.value)}
                          required
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Payment Date</label>
                        <input
                          type="date"
                          value={formDate}
                          onChange={(e) => setFormDate(e.target.value)}
                          required
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>Payment for Month</label>
                      <select
                        value={formMonthYear}
                        onChange={(e) => setFormMonthYear(e.target.value)}
                        className={selectCls}
                      >
                        {MONTH_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelCls}>
                        Note{" "}
                        <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. June tuition, partial payment…"
                        value={formNote}
                        onChange={(e) => setFormNote(e.target.value)}
                        className={inputCls}
                      />
                    </div>

                    {addError && <ErrorPill message={addError} />}

                    {addSuccess && (
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Payment recorded successfully!
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <button type="submit" disabled={adding} className={primaryBtnCls}>
                        {adding && <Spinner />}
                        {adding ? "Saving…" : "Add Payment"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Student summary */}
              <div className="lg:col-span-2">
                {formStudentId ? (
                  <StudentProfileCard
                    student={formStudent}
                    payments={studentPayments}
                    loading={summaryLoading}
                  />
                ) : (
                  <div className="bg-white rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center py-14 text-gray-400">
                    <svg className="w-10 h-10 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                    <p className="text-sm text-center px-4">
                      Select a student to see their payment history.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── History Tab ─────────────────────────────────────────────── */}
          {activeTab === "history" && (
            <div className="space-y-5">
              {/* Filters */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-48">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Student
                    </label>
                    <select
                      value={histStudentId}
                      onChange={(e) => setHistStudentId(e.target.value)}
                      className={selectCls}
                    >
                      <option value="">All Students</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-48">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Month
                    </label>
                    <select
                      value={histMonthYear}
                      onChange={(e) => setHistMonthYear(e.target.value)}
                      className={selectCls}
                    >
                      <option value="">All Months</option>
                      {MONTH_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={fetchHistory}
                    disabled={histLoading}
                    className={ghostBtnCls}
                  >
                    {histLoading ? <Spinner /> : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    )}
                    Refresh
                  </button>
                </div>
              </div>

              {/* Student profile (when filtered by student) */}
              {histStudentId && histStudent && (
                <StudentProfileCard
                  student={histStudent}
                  payments={histRecords}
                  loading={histLoading}
                />
              )}

              {/* Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                  <h2 className="text-sm font-semibold text-gray-900">Payment Records</h2>
                  {!histLoading && histRecords.length > 0 && (
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{histRecords.length} record{histRecords.length !== 1 ? "s" : ""}</span>
                      <span className="font-semibold text-emerald-700">
                        {formatAmount(histTotal)}
                      </span>
                    </div>
                  )}
                </div>

                {histError && <div className="p-5"><ErrorPill message={histError} /></div>}

                {histLoading ? (
                  <div className="flex items-center justify-center gap-2 py-14 text-gray-400">
                    <Spinner size="md" />
                    <span className="text-sm">Loading payments…</span>
                  </div>
                ) : histRecords.length === 0 && !histError ? (
                  <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                    <svg className="w-9 h-9 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                    </svg>
                    <p className="text-sm">No payment records found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {["Student", "Amount", "Month", "Date", "Note", "Actions"].map((h) => (
                            <th
                              key={h}
                              className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {histRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {record.student.fullName}
                            </td>
                            <td className="px-4 py-3 font-semibold text-emerald-700">
                              {formatAmount(record.amount)}
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {formatMonth(record.month, record.year)}
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {formatDate(record.paymentDate)}
                            </td>
                            <td className="px-4 py-3 text-gray-400 max-w-xs truncate">
                              {record.note ?? <span className="italic text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              {deletingId === record.id ? (
                                <span className="flex items-center gap-1 text-gray-400 text-xs">
                                  <Spinner /> Deleting…
                                </span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => openEdit(record)}
                                    className="inline-flex items-center rounded border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(record.id)}
                                    className="inline-flex items-center rounded border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Modal ───────────────────────────────────────────────────── */}
      {editingPayment && (
        <Backdrop onClick={closeEdit}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Edit Payment</h2>
                <p className="text-xs text-gray-500 mt-0.5">{editingPayment.student.fullName}</p>
              </div>
              <button
                onClick={closeEdit}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Amount (UZS)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    required
                    autoFocus
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Payment Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    required
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Payment for Month</label>
                <select
                  value={editMonthYear}
                  onChange={(e) => setEditMonthYear(e.target.value)}
                  className={selectCls}
                >
                  {MONTH_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Note</label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Optional note"
                  className={inputCls}
                />
              </div>
              {editError && <ErrorPill message={editError} />}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={closeEdit} className={ghostBtnCls}>
                  Cancel
                </button>
                <button type="submit" disabled={editSaving} className={primaryBtnCls}>
                  {editSaving && <Spinner />}
                  {editSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </ModalCard>
        </Backdrop>
      )}

      {/* ── Delete Confirmation ──────────────────────────────────────────── */}
      {deleteConfirmId && deletePayment && (
        <Backdrop onClick={() => setDeleteConfirmId(null)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Delete payment?</h2>
                <p className="mt-1 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{formatAmount(deletePayment.amount)}</span>
                  {" "}for{" "}
                  <span className="font-medium text-gray-700">{deletePayment.student.fullName}</span>
                  {" "}({formatMonth(deletePayment.month, deletePayment.year)}) will be permanently removed.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setDeleteConfirmId(null)} className={ghostBtnCls}>
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                Delete Payment
              </button>
            </div>
          </ModalCard>
        </Backdrop>
      )}
    </>
  );
}
