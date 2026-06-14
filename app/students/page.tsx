"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";

type Student = {
  id: string;
  fullName: string;
  phone: string;
  createdAt: string;
};

export default function StudentsPage() {
  const { t, dateLocale } = useTranslation();
  // ── list ─────────────────────────────────────────────────────────────
  const [students, setStudents] = useState<Student[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // ── add-student form ──────────────────────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // ── edit modal ────────────────────────────────────────────────────────
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // ── delete ────────────────────────────────────────────────────────────
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── data fetching ─────────────────────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch("/api/students", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `HTTP ${res.status}`);
      }
      setStudents(await res.json());
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load students");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Close modals on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setEditingStudent(null);
      setDeleteConfirmId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── add student ───────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddSubmitting(true);
    setAddError(null);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `HTTP ${res.status}`);
      }
      setFullName("");
      setPhone("");
      await fetchStudents();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add student");
    } finally {
      setAddSubmitting(false);
    }
  }

  // ── edit student ──────────────────────────────────────────────────────
  function openEdit(student: Student) {
    setEditingStudent(student);
    setEditFullName(student.fullName);
    setEditPhone(student.phone);
    setEditError(null);
  }

  function closeEdit() {
    setEditingStudent(null);
    setEditError(null);
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingStudent) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: editFullName, phone: editPhone }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `HTTP ${res.status}`);
      }
      closeEdit();
      await fetchStudents();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update student");
    } finally {
      setEditSubmitting(false);
    }
  }

  // ── delete student ────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteConfirmId(null);
    try {
      const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `HTTP ${res.status}`);
      }
      await fetchStudents();
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to delete student");
    } finally {
      setDeletingId(null);
    }
  }

  const studentToDelete = students.find((s) => s.id === deleteConfirmId);

  // ── render ────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t.students.title}</h1>
            <p className="mt-1 text-sm text-gray-500">{t.students.subtitle}</p>
          </div>

          {/* Add Student */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-5">{t.students.addStudent}</h2>
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t.students.fullName}
                required
                disabled={addSubmitting}
                className={inputCls}
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.students.phone}
                required
                disabled={addSubmitting}
                className={inputCls}
              />
              <button
                type="submit"
                disabled={addSubmitting || !fullName.trim() || !phone.trim()}
                className={primaryBtnCls}
              >
                {addSubmitting ? t.students.adding : t.students.addStudent}
              </button>
            </form>
            {addError && <ErrorPill>{addError}</ErrorPill>}
          </section>

          {/* Table */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                {t.students.allStudents}
                {!listLoading && (
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    ({students.length})
                  </span>
                )}
              </h2>
              {!listLoading && (
                <button
                  onClick={fetchStudents}
                  className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
                >
                  ↻ {t.common.refresh}
                </button>
              )}
            </div>

            {listLoading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-gray-400 text-sm">
                <Spinner /> {t.students.loading}
              </div>
            ) : listError ? (
              <div className="py-16 text-center">
                <p className="text-red-600 text-sm">{listError}</p>
                <button
                  onClick={fetchStudents}
                  className="mt-3 text-sm text-blue-600 hover:underline"
                >
                  {t.students.tryAgain}
                </button>
              </div>
            ) : students.length === 0 ? (
              <div className="py-20 text-center text-gray-400 text-sm">
                {t.students.noStudents}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <Th>{t.students.fullName}</Th>
                      <Th>{t.students.phone}</Th>
                      <Th>{t.students.createdAt}</Th>
                      <Th>
                        <span className="sr-only">{t.common.actions}</span>
                      </Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((student) => {
                      const isDeleting = deletingId === student.id;
                      const isRowBusy = isDeleting;
                      return (
                        <tr
                          key={student.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {student.fullName}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {student.phone}
                          </td>
                          <td className="px-6 py-4 text-gray-400">
                            {formatDate(student.createdAt, dateLocale)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {isDeleting ? (
                                <Spinner className="text-gray-400" />
                              ) : (
                                <>
                                  <button
                                    onClick={() => openEdit(student)}
                                    disabled={isRowBusy}
                                    className="rounded-md px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {t.common.edit}
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(student.id)}
                                    disabled={isRowBusy}
                                    className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {t.common.delete}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ── Edit Modal ─────────────────────────────────────────────────── */}
      {editingStudent && (
        <Backdrop onClick={closeEdit}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">{t.students.editStudent}</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className={labelCls}>{t.students.fullName}</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                  disabled={editSubmitting}
                  className={`${inputCls} w-full`}
                />
              </div>
              <div>
                <label className={labelCls}>{t.students.phone}</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  required
                  disabled={editSubmitting}
                  className={`${inputCls} w-full`}
                />
              </div>
              {editError && <ErrorPill>{editError}</ErrorPill>}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={editSubmitting}
                  className={ghostBtnCls}
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={
                    editSubmitting ||
                    !editFullName.trim() ||
                    !editPhone.trim()
                  }
                  className={primaryBtnCls}
                >
                  {editSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Spinner /> {t.common.saving}
                    </span>
                  ) : (
                    t.common.saveChanges
                  )}
                </button>
              </div>
            </form>
          </ModalCard>
        </Backdrop>
      )}

      {/* ── Delete Confirmation ────────────────────────────────────────── */}
      {deleteConfirmId && studentToDelete && (
        <Backdrop onClick={() => setDeleteConfirmId(null)}>
          <ModalCard onClick={(e) => e.stopPropagation()} narrow>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {t.students.deleteStudent}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">
                    {studentToDelete.fullName}
                  </span>{" "}
                  {t.students.deleteConfirm}
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className={`${ghostBtnCls} flex-1`}
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 active:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  {t.common.delete}
                </button>
              </div>
            </div>
          </ModalCard>
        </Backdrop>
      )}
    </>
  );
}

// ── Shared style constants ─────────────────────────────────────────────────
const inputCls =
  "rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:opacity-60 transition";

const primaryBtnCls =
  "rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap";

const ghostBtnCls =
  "rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";

// ── Small components ───────────────────────────────────────────────────────
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
      {children}
    </th>
  );
}

function ErrorPill({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
      {children}
    </p>
  );
}

function Backdrop({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function ModalCard({
  children,
  onClick,
  narrow,
}: {
  children: React.ReactNode;
  onClick: React.MouseEventHandler<HTMLDivElement>;
  narrow?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-xl border border-gray-200 p-8 w-full ${narrow ? "max-w-sm" : "max-w-md"}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin h-4 w-4 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
