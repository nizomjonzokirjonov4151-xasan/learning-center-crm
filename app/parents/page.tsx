"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { SearchInput } from "@/app/components/ui/SearchInput";
import { PasswordInput } from "@/app/components/ui/PasswordInput";

type StudentOption = { id: string; fullName: string; phone: string; group?: { name: string } | null };
type ParentStudent = { id: string; fullName: string; phone: string; group?: { id: string; name: string } | null };
type ParentUser = { id: string; isActive: boolean; createdAt: string; forcePasswordChange: boolean };

type Parent = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  createdAt: string;
  user: ParentUser;
  students: ParentStudent[];
};

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";
const primaryBtnCls = "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors";
const ghostBtnCls = "inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
const dangerBtnCls = "inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-colors";

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function ErrorPill({ message }: { message: string }) {
  return <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{message}</div>;
}

function Backdrop({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClick}>
      {children}
    </div>
  );
}

function ModalCard({ onClick, children }: { onClick: (e: React.MouseEvent) => void; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={onClick}>
      {children}
    </div>
  );
}

function StudentMultiSelect({
  options,
  selected,
  onChange,
  placeholder,
}: {
  options: StudentOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
      {options.length === 0 ? (
        <p className="px-3 py-3 text-sm text-gray-400">{placeholder}</p>
      ) : (
        options.map((s) => (
          <label
            key={s.id}
            className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
          >
            <input
              type="checkbox"
              checked={selected.includes(s.id)}
              onChange={() => toggle(s.id)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{s.fullName}</p>
              <p className="text-xs text-gray-400 truncate">{s.group?.name ?? "—"} · {s.phone}</p>
            </div>
          </label>
        ))
      )}
    </div>
  );
}

export default function ParentsPage() {
  const { t, dateLocale } = useTranslation();

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric" });
  }

  const [parents, setParents] = useState<Parent[]>([]);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ fullName: "", phone: "", email: "", password: "", studentIds: [] as string[] });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [editForm, setEditForm] = useState({ fullName: "", phone: "", email: "", isActive: true, studentIds: [] as string[] });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Parent | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Reset password
  const [resetTarget, setResetTarget] = useState<Parent | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch("/api/parents"),
        fetch("/api/students"),
      ]);
      if (!pRes.ok) throw new Error(`HTTP ${pRes.status}`);
      setParents(await pRes.json());
      if (sRes.ok) setAllStudents(await sRes.json());
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setShowCreate(false); setEditingParent(null); setDeleteTarget(null); setResetTarget(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true); setCreateError(null);
    try {
      const res = await fetch("/api/parents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? `HTTP ${res.status}`);
      setParents((prev) => [data, ...prev]);
      setShowCreate(false);
      setCreateForm({ fullName: "", phone: "", email: "", password: "", studentIds: [] });
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingParent) return;
    setEditSaving(true); setEditError(null);
    try {
      const res = await fetch(`/api/parents/${editingParent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? `HTTP ${res.status}`);
      setParents((prev) => prev.map((p) => (p.id === data.id ? data : p)));
      setEditingParent(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id); setDeleteTarget(null);
    try {
      const res = await fetch(`/api/parents/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setParents((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggle(p: Parent) {
    setTogglingId(p.id);
    try {
      const res = await fetch(`/api/parents/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: p.fullName, phone: p.phone, email: p.email,
          isActive: !p.user.isActive,
          studentIds: p.students.map((s) => s.id),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setParents((prev) => prev.map((x) => (x.id === data.id ? data : x)));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    setResetting(true); setResetError(null);
    try {
      const res = await fetch(`/api/parents/${resetTarget.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error);
      setResetTarget(null); setResetPwd("");
    } catch (e) {
      setResetError(e instanceof Error ? e.message : "Failed");
    } finally {
      setResetting(false);
    }
  }

  function openEdit(p: Parent) {
    setEditingParent(p);
    setEditForm({
      fullName: p.fullName,
      phone: p.phone,
      email: p.email,
      isActive: p.user.isActive,
      studentIds: p.students.map((s) => s.id),
    });
    setEditError(null);
  }

  const query = search.trim().toLowerCase();
  const filtered = query
    ? parents.filter((p) =>
        p.fullName.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        p.phone.includes(query)
      )
    : parents;

  const activeCount = parents.filter((p) => p.user.isActive).length;

  // Students not yet linked (for create: exclude all already-linked students)
  const linkedStudentIds = new Set(parents.flatMap((p) => p.students.map((s) => s.id)));
  const availableStudents = allStudents.filter((s) => !linkedStudentIds.has(s.id));

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-6 px-4 sm:py-10 sm:px-8">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t.parents.title}</h1>
              <p className="mt-1 text-sm text-gray-500">{t.parents.subtitle}</p>
            </div>
            <div className="flex items-center gap-4">
              {!loading && (
                <div className="text-sm text-gray-500 hidden sm:flex gap-4">
                  <span><span className="font-semibold text-gray-900">{parents.length}</span> {t.parents.total}</span>
                  <span className="text-emerald-600"><span className="font-semibold">{activeCount}</span> {t.parents.active}</span>
                </div>
              )}
              <button onClick={() => { setCreateForm({ fullName: "", phone: "", email: "", password: "", studentIds: [] }); setCreateError(null); setShowCreate(true); }} className={primaryBtnCls}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {t.parents.createParent}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
              <h2 className="text-base font-semibold text-gray-900 flex-1">
                {t.parents.allParents}
                {!loading && (
                  <span className="ml-2 text-sm font-normal text-gray-400">({filtered.length})</span>
                )}
              </h2>
              <SearchInput value={search} onChange={setSearch} placeholder={t.parents.searchPlaceholder} className="w-56" />
            </div>

            {listError && <div className="p-5"><ErrorPill message={listError} /></div>}

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
                <Spinner /><span className="text-sm">{t.parents.loading}</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <p className="text-sm">{query ? t.parents.noParentsMatch : t.parents.noParents}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {[t.parents.nameColumn, t.parents.contactColumn, t.parents.studentsColumn, t.parents.statusColumn, t.parents.joined, t.common.actions].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center justify-center flex-shrink-0 uppercase">
                              {p.fullName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{p.fullName}</p>
                              <p className="text-xs text-gray-400 truncate">{p.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{p.phone}</td>
                        <td className="px-4 py-3">
                          {p.students.length === 0 ? (
                            <span className="text-xs text-gray-300">{t.parents.noLinkedStudents}</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {p.students.map((s) => (
                                <span key={s.id} className="inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs text-blue-700">
                                  {s.fullName}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggle(p)}
                            disabled={togglingId === p.id}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                              p.user.isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                            }`}
                          >
                            {togglingId === p.id ? <Spinner /> : (
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${p.user.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                            )}
                            {p.user.isActive ? t.parents.statusActive : t.parents.statusInactive}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{formatDate(p.user.createdAt)}</td>
                        <td className="px-4 py-3">
                          {deletingId === p.id ? (
                            <span className="flex items-center gap-1 text-gray-400 text-xs"><Spinner /> {t.common.deleting}</span>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button onClick={() => openEdit(p)} className="inline-flex items-center rounded border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                                {t.common.edit}
                              </button>
                              <button onClick={() => { setResetTarget(p); setResetPwd(""); setResetError(null); }} className="inline-flex items-center rounded border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors">
                                {t.parents.resetPassword}
                              </button>
                              <button onClick={() => setDeleteTarget(p)} className="inline-flex items-center rounded border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
                                {t.common.delete}
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

      {/* Create Modal */}
      {showCreate && (
        <Backdrop onClick={() => setShowCreate(false)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">{t.parents.createParent}</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className={labelCls}>{t.parents.fullName} <span className="text-red-500">*</span></label>
                <input type="text" placeholder={t.parents.fullNamePlaceholder} value={createForm.fullName}
                  onChange={(e) => setCreateForm((p) => ({ ...p, fullName: e.target.value }))} required className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t.parents.contactColumn} <span className="text-red-500">*</span></label>
                  <input type="tel" placeholder={t.parents.phonePlaceholder} value={createForm.phone}
                    onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))} required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t.auth.emailLabel} <span className="text-red-500">*</span></label>
                  <input type="email" placeholder={t.parents.emailPlaceholder} value={createForm.email}
                    onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} required className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>{t.parents.tempPassword} <span className="text-red-500">*</span></label>
                <PasswordInput autoComplete="new-password" placeholder={t.parents.minChars} value={createForm.password}
                  onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} required minLength={6} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t.parents.selectStudents}</label>
                <StudentMultiSelect
                  options={availableStudents}
                  selected={createForm.studentIds}
                  onChange={(ids) => setCreateForm((p) => ({ ...p, studentIds: ids }))}
                  placeholder={t.parents.noStudentsAvailable}
                />
                {createForm.studentIds.length > 0 && (
                  <p className="mt-1 text-xs text-blue-600">{createForm.studentIds.length} selected</p>
                )}
              </div>
              {createError && <ErrorPill message={createError} />}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className={ghostBtnCls}>{t.common.cancel}</button>
                <button type="submit" disabled={creating} className={primaryBtnCls}>
                  {creating && <Spinner />}
                  {creating ? t.parents.creating : t.parents.createParent}
                </button>
              </div>
            </form>
          </ModalCard>
        </Backdrop>
      )}

      {/* Edit Modal */}
      {editingParent && (
        <Backdrop onClick={() => setEditingParent(null)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">{t.parents.editParent}</h2>
              <button onClick={() => setEditingParent(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className={labelCls}>{t.parents.fullName}</label>
                <input type="text" value={editForm.fullName}
                  onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))} required className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t.parents.contactColumn}</label>
                  <input type="tel" value={editForm.phone}
                    onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t.auth.emailLabel}</label>
                  <input type="email" value={editForm.email}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} required className={inputCls} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input id="parentActive" type="checkbox" checked={editForm.isActive}
                  onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <label htmlFor="parentActive" className="text-sm text-gray-700">{t.parents.statusActive}</label>
              </div>
              <div>
                <label className={labelCls}>{t.parents.selectStudents}</label>
                <StudentMultiSelect
                  options={allStudents.filter((s) =>
                    !linkedStudentIds.has(s.id) || editingParent.students.some((es) => es.id === s.id)
                  )}
                  selected={editForm.studentIds}
                  onChange={(ids) => setEditForm((p) => ({ ...p, studentIds: ids }))}
                  placeholder={t.parents.noStudentsAvailable}
                />
                {editForm.studentIds.length > 0 && (
                  <p className="mt-1 text-xs text-blue-600">{editForm.studentIds.length} selected</p>
                )}
              </div>
              {editError && <ErrorPill message={editError} />}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setEditingParent(null)} className={ghostBtnCls}>{t.common.cancel}</button>
                <button type="submit" disabled={editSaving} className={primaryBtnCls}>
                  {editSaving && <Spinner />}
                  {editSaving ? t.common.saving : t.common.saveChanges}
                </button>
              </div>
            </form>
          </ModalCard>
        </Backdrop>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <Backdrop onClick={() => setResetTarget(null)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{t.parents.resetPassword}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{resetTarget.fullName}</p>
              </div>
              <button onClick={() => setResetTarget(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className={labelCls}>{t.parents.newPassword} <span className="text-red-500">*</span></label>
                <PasswordInput autoComplete="new-password" placeholder={t.parents.minChars} value={resetPwd}
                  onChange={(e) => setResetPwd(e.target.value)} required minLength={6} autoFocus className={inputCls} />
              </div>
              {resetError && <ErrorPill message={resetError} />}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setResetTarget(null)} className={ghostBtnCls}>{t.common.cancel}</button>
                <button type="submit" disabled={resetting} className={primaryBtnCls}>
                  {resetting && <Spinner />}
                  {resetting ? t.common.saving : t.parents.resetPassword}
                </button>
              </div>
            </form>
          </ModalCard>
        </Backdrop>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <Backdrop onClick={() => setDeleteTarget(null)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">{t.parents.deleteParent}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{deleteTarget.fullName}</span> {t.parents.deleteConfirm}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setDeleteTarget(null)} className={ghostBtnCls}>{t.common.cancel}</button>
              <button onClick={() => handleDelete(deleteTarget.id)} className={dangerBtnCls}>{t.parents.deleteParent}</button>
            </div>
          </ModalCard>
        </Backdrop>
      )}
    </>
  );
}
