"use client";

import { useState, useEffect, useCallback } from "react";

type Teacher = {
  id: string;
  fullName: string;
  phone: string;
  subject: string;
  salary: number;
  isActive: boolean;
  createdAt: string;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatSalary(n: number) {
  return new Intl.NumberFormat("en-US").format(n) + " UZS";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Style constants ──────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";
const primaryBtnCls =
  "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors";
const ghostBtnCls =
  "inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

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
    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6" onClick={onClick}>
      {children}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
      {children}
    </th>
  );
}

function ActiveBadge({
  isActive,
  onClick,
  loading,
}: {
  isActive: boolean;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={isActive ? "Click to deactivate" : "Click to activate"}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        isActive
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
          : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
      }`}
    >
      {loading ? (
        <Spinner />
      ) : (
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-gray-400"}`}
        />
      )}
      {isActive ? "Active" : "Inactive"}
    </button>
  );
}

// ── Empty state for add form ─────────────────────────────────────────────────

const EMPTY_FORM = { fullName: "", phone: "", subject: "", salary: "" };

// ── Main Page ────────────────────────────────────────────────────────────────

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // ── Add form ────────────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // ── Edit modal ───────────────────────────────────────────────────────────
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // ── Delete ───────────────────────────────────────────────────────────────
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Active toggle ────────────────────────────────────────────────────────
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await fetch("/api/teachers");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTeachers(await res.json());
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load teachers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // Escape closes modals
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setEditingTeacher(null);
      setDeleteConfirmId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Add teacher ──────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? data.error ?? `HTTP ${res.status}`);
      }
      const created: Teacher = await res.json();
      setTeachers((prev) => [created, ...prev]);
      setForm(EMPTY_FORM);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to add teacher");
    } finally {
      setAdding(false);
    }
  }

  // ── Edit teacher ─────────────────────────────────────────────────────────
  function openEdit(t: Teacher) {
    setEditingTeacher(t);
    setEditForm({
      fullName: t.fullName,
      phone: t.phone,
      subject: t.subject,
      salary: String(t.salary),
    });
    setEditError(null);
  }

  function closeEdit() {
    setEditingTeacher(null);
    setEditError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTeacher) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/teachers/${editingTeacher.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, isActive: editingTeacher.isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? data.error ?? `HTTP ${res.status}`);
      }
      const updated: Teacher = await res.json();
      setTeachers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      closeEdit();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to save changes");
    } finally {
      setEditSaving(false);
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────
  async function handleToggleActive(teacher: Teacher) {
    setTogglingId(teacher.id);
    try {
      const res = await fetch(`/api/teachers/${teacher.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: teacher.fullName,
          phone: teacher.phone,
          subject: teacher.subject,
          salary: teacher.salary,
          isActive: !teacher.isActive,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated: Teacher = await res.json();
      setTeachers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingId(null);
    }
  }

  // ── Delete teacher ────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteConfirmId(null);
    try {
      await fetch(`/api/teachers/${id}`, { method: "DELETE" });
      setTeachers((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  // ── Filtered list ─────────────────────────────────────────────────────────
  const query = search.trim().toLowerCase();
  const filtered = query
    ? teachers.filter(
        (t) =>
          t.fullName.toLowerCase().includes(query) ||
          t.subject.toLowerCase().includes(query) ||
          t.phone.includes(query)
      )
    : teachers;

  const activeCount = teachers.filter((t) => t.isActive).length;
  const deleteTeacher = teachers.find((t) => t.id === deleteConfirmId);

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-10 px-8">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your learning center teaching staff.
              </p>
            </div>
            {!loading && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500">
                  <span className="font-semibold text-gray-900">{teachers.length}</span> total
                </span>
                <span className="text-emerald-600">
                  <span className="font-semibold">{activeCount}</span> active
                </span>
              </div>
            )}
          </div>

          {/* Add Teacher */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Add New Teacher</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Aziz Karimov"
                    value={form.fullName}
                    onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+998901234567"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. English, Math, Science"
                    value={form.subject}
                    onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Salary (UZS) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 3000000"
                    value={form.salary}
                    onChange={(e) => setForm((p) => ({ ...p, salary: e.target.value }))}
                    required
                    className={inputCls}
                  />
                </div>
              </div>
              {addError && <ErrorPill message={addError} />}
              <div className="flex justify-end">
                <button type="submit" disabled={adding} className={primaryBtnCls}>
                  {adding && <Spinner />}
                  {adding ? "Adding…" : "Add Teacher"}
                </button>
              </div>
            </form>
          </div>

          {/* Teachers List */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Table header + search */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
              <h2 className="text-base font-semibold text-gray-900 flex-1">
                All Teachers
                {!loading && (
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    ({filtered.length}{query ? ` of ${teachers.length}` : ""})
                  </span>
                )}
              </h2>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search name, subject…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none w-52"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {listError && <div className="p-5"><ErrorPill message={listError} /></div>}

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
                <Spinner size="md" />
                <span className="text-sm">Loading teachers…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <svg
                  className="w-10 h-10 mb-3 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                </svg>
                <p className="text-sm">
                  {query ? `No teachers match "${search}".` : "No teachers yet. Add your first teacher above."}
                </p>
                {query && (
                  <button onClick={() => setSearch("")} className="mt-2 text-sm text-blue-600 hover:underline">
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <Th>Full Name</Th>
                      <Th>Phone</Th>
                      <Th>Subject</Th>
                      <Th>Salary</Th>
                      <Th>Status</Th>
                      <Th>Joined</Th>
                      <Th>Actions</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((teacher) => (
                      <tr key={teacher.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                              {teacher.fullName
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900">{teacher.fullName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{teacher.phone}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                            {teacher.subject}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {formatSalary(teacher.salary)}
                        </td>
                        <td className="px-4 py-3">
                          <ActiveBadge
                            isActive={teacher.isActive}
                            loading={togglingId === teacher.id}
                            onClick={() => handleToggleActive(teacher)}
                          />
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {formatDate(teacher.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          {deletingId === teacher.id ? (
                            <span className="flex items-center gap-1 text-gray-400 text-xs">
                              <Spinner /> Deleting…
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEdit(teacher)}
                                className="inline-flex items-center rounded border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(teacher.id)}
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
      </div>

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      {editingTeacher && (
        <Backdrop onClick={closeEdit}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Edit Teacher</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editingTeacher.fullName}</p>
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
                <div className="col-span-2">
                  <label className={labelCls}>Full Name</label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                    required
                    autoFocus
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Subject</label>
                  <input
                    type="text"
                    value={editForm.subject}
                    onChange={(e) => setEditForm((p) => ({ ...p, subject: e.target.value }))}
                    required
                    className={inputCls}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Salary (UZS)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editForm.salary}
                    onChange={(e) => setEditForm((p) => ({ ...p, salary: e.target.value }))}
                    required
                    className={inputCls}
                  />
                </div>
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

      {/* ── Delete Confirmation ───────────────────────────────────────────── */}
      {deleteConfirmId && deleteTeacher && (
        <Backdrop onClick={() => setDeleteConfirmId(null)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Delete teacher?</h2>
                <p className="mt-1 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{deleteTeacher.fullName}</span>
                  {" "}({deleteTeacher.subject}) will be permanently removed.
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
                Delete Teacher
              </button>
            </div>
          </ModalCard>
        </Backdrop>
      )}
    </>
  );
}
