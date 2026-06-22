"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { SearchInput } from "@/app/components/ui/SearchInput";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { TableRowSkeleton } from "@/app/components/ui/Skeleton";
import { Button } from "@/app/components/ui/Button";

type GroupOption = { id: string; name: string; teacher: { id: string; fullName: string; subject: string } | null };

type Student = {
  id: string;
  fullName: string;
  phone: string;
  group: { id: string; name: string; teacher: { id: string; fullName: string; subject: string } | null } | null;
  createdAt: string;
};

export default function StudentsPage() {
  const { t, dateLocale } = useTranslation();

  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [groupId, setGroupId] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGroupId, setEditGroupId] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const fetchAll = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const [sRes, gRes] = await Promise.all([
        fetch("/api/students", { cache: "no-store" }),
        fetch("/api/groups"),
      ]);
      if (!sRes.ok) {
        const body = await sRes.json().catch(() => ({}));
        throw new Error(body.detail ?? `HTTP ${sRes.status}`);
      }
      setStudents(await sRes.json());
      if (gRes.ok) setGroups(await gRes.json());
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load students");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setEditingStudent(null);
      setDeleteConfirmId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddSubmitting(true);
    setAddError(null);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, groupId: groupId || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`);
      }
      setFullName("");
      setPhone("");
      setGroupId("");
      await fetchAll();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add student");
    } finally {
      setAddSubmitting(false);
    }
  }

  function openEdit(student: Student) {
    setEditingStudent(student);
    setEditFullName(student.fullName);
    setEditPhone(student.phone);
    setEditGroupId(student.group?.id ?? "");
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
        body: JSON.stringify({ fullName: editFullName, phone: editPhone, groupId: editGroupId || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`);
      }
      closeEdit();
      await fetchAll();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update student");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteConfirmId(null);
    try {
      const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `HTTP ${res.status}`);
      }
      await fetchAll();
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to delete student");
    } finally {
      setDeletingId(null);
    }
  }

  const studentToDelete = students.find((s) => s.id === deleteConfirmId);

  const query = search.trim().toLowerCase();
  const filteredStudents = query
    ? students.filter(
        (s) =>
          s.fullName.toLowerCase().includes(query) ||
          s.phone.includes(query) ||
          (s.group?.name.toLowerCase().includes(query) ?? false)
      )
    : students;

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-5xl mx-auto space-y-8">

          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t.students.title}</h1>
            <p className="mt-1 text-sm text-gray-500">{t.students.subtitle}</p>
          </div>

          {/* Add Student */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-5">{t.students.addStudent}</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <div className="sm:col-span-2">
                  <label className={labelCls}>{t.students.groupLabel} <span className="text-red-500">*</span></label>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    required
                    disabled={addSubmitting}
                    className={inputCls}
                  >
                    <option value="">{t.students.groupPlaceholder}</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}{g.teacher ? ` (${g.teacher.fullName})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {addError && <ErrorPill>{addError}</ErrorPill>}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  loading={addSubmitting}
                  disabled={addSubmitting || !fullName.trim() || !phone.trim() || !groupId}
                >
                  {addSubmitting ? t.students.adding : t.students.addStudent}
                </Button>
              </div>
            </form>
          </section>

          {/* Table */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 flex-wrap">
              <h2 className="text-lg font-semibold text-gray-800">
                {t.students.allStudents}
                {!listLoading && (
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    ({filteredStudents.length}{query ? ` of ${students.length}` : ""})
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-3">
                {!listLoading && students.length > 0 && (
                  <SearchInput value={search} onChange={setSearch} placeholder={t.common.search} className="w-56" />
                )}
                {!listLoading && (
                  <button onClick={fetchAll} className="text-sm text-gray-400 hover:text-gray-700 transition-colors whitespace-nowrap">
                    ↻ {t.common.refresh}
                  </button>
                )}
              </div>
            </div>

            {listLoading ? (
              <table className="w-full text-sm">
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRowSkeleton key={i} widths={[160, 110, 100, 110, 90, 70]} />
                  ))}
                </tbody>
              </table>
            ) : listError ? (
              <div className="py-16 text-center">
                <p className="text-red-600 text-sm">{listError}</p>
                <button onClick={fetchAll} className="mt-3 text-sm text-blue-600 hover:underline">
                  {t.students.tryAgain}
                </button>
              </div>
            ) : students.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                  </svg>
                }
                title={t.students.noStudents}
              />
            ) : filteredStudents.length === 0 ? (
              <EmptyState
                title={t.common.noData}
                description={query}
                action={
                  <button onClick={() => setSearch("")} className="text-sm text-blue-600 hover:underline">
                    {t.common.clearSearch}
                  </button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <Th>{t.students.fullName}</Th>
                      <Th>{t.students.phone}</Th>
                      <Th>{t.students.groupLabel}</Th>
                      <Th>{t.students.teacherLabel}</Th>
                      <Th>{t.students.createdAt}</Th>
                      <Th><span className="sr-only">{t.common.actions}</span></Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredStudents.map((student) => {
                      const isDeleting = deletingId === student.id;
                      return (
                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{student.fullName}</td>
                          <td className="px-6 py-4 text-gray-600">{student.phone}</td>
                          <td className="px-6 py-4">
                            {student.group ? (
                              <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                {student.group.name}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-300 italic">{t.students.noGroup}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-600 text-xs">
                            {student.group?.teacher ? (
                              <span>{student.group.teacher.fullName}</span>
                            ) : (
                              <span className="text-gray-300 italic">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-400">{formatDate(student.createdAt, dateLocale)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {isDeleting ? (
                                <Spinner className="text-gray-400" />
                              ) : (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => openEdit(student)}>
                                    {t.common.edit}
                                  </Button>
                                  <Button size="sm" variant="danger" onClick={() => setDeleteConfirmId(student.id)}>
                                    {t.common.delete}
                                  </Button>
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

      {/* Edit Modal */}
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
              <div>
                <label className={labelCls}>{t.students.groupLabel}</label>
                <select
                  value={editGroupId}
                  onChange={(e) => setEditGroupId(e.target.value)}
                  disabled={editSubmitting}
                  className={`${inputCls} w-full`}
                >
                  <option value="">{t.students.groupPlaceholder}</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}{g.teacher ? ` (${g.teacher.fullName})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {editError && <ErrorPill>{editError}</ErrorPill>}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={closeEdit} disabled={editSubmitting}>
                  {t.common.cancel}
                </Button>
                <Button
                  type="submit"
                  loading={editSubmitting}
                  disabled={editSubmitting || !editFullName.trim() || !editPhone.trim()}
                >
                  {editSubmitting ? t.common.saving : t.common.saveChanges}
                </Button>
              </div>
            </form>
          </ModalCard>
        </Backdrop>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && studentToDelete && (
        <Backdrop onClick={() => setDeleteConfirmId(null)}>
          <ModalCard onClick={(e) => e.stopPropagation()} narrow>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t.students.deleteStudent}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{studentToDelete.fullName}</span>{" "}
                  {t.students.deleteConfirm}
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} className="flex-1">
                  {t.common.cancel}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 !bg-red-600 hover:!bg-red-700 active:!bg-red-800 focus-visible:!ring-red-500"
                >
                  {t.common.delete}
                </Button>
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
  "rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:opacity-60 transition w-full";

const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
      {children}
    </th>
  );
}

function ErrorPill({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
      {children}
    </p>
  );
}

function Backdrop({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
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
    <svg className={`animate-spin h-4 w-4 ${className}`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
