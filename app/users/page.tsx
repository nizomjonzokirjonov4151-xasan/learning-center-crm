"use client";

import { useState, useEffect, useCallback } from "react";

type UserRole = "ADMIN" | "MANAGER" | "TEACHER";

type TeacherInfo = {
  id: string;
  fullName: string;
  subject: string;
  phone: string;
  salary: number;
};

type User = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  teacherId: string | null;
  teacher: TeacherInfo | null;
};

// ── Style constants ──────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";
const primaryBtnCls =
  "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors";
const ghostBtnCls =
  "inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
const dangerBtnCls =
  "inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors";

const ROLE_LABELS: Record<UserRole, string> = { ADMIN: "Admin", MANAGER: "Manager", TEACHER: "Teacher" };
const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: "bg-violet-50 text-violet-700 border-violet-200",
  MANAGER: "bg-blue-50 text-blue-700 border-blue-200",
  TEACHER: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

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
    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={onClick}>
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Empty forms ──────────────────────────────────────────────────────────────

const EMPTY_CREATE = {
  fullName: "", email: "", password: "", role: "ADMIN" as UserRole,
  phone: "", subject: "", salary: "",
};
const EMPTY_EDIT = { fullName: "", email: "", role: "ADMIN" as UserRole, isActive: true };

// ── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Reset password
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Toggle active
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUsers(await res.json());
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setShowCreate(false);
      setEditingUser(null);
      setDeleteConfirmId(null);
      setResetUserId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Create ───────────────────────────────────────────────────────────────

  function openCreate() {
    setCreateForm(EMPTY_CREATE);
    setCreateError(null);
    setShowCreate(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? `HTTP ${res.status}`);
      setUsers((prev) => [data, ...prev]);
      setShowCreate(false);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────

  function openEdit(u: User) {
    setEditingUser(u);
    setEditForm({ fullName: u.fullName, email: u.email, role: u.role, isActive: u.isActive });
    setEditError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? `HTTP ${res.status}`);
      setUsers((prev) => prev.map((u) => (u.id === data.id ? data : u)));
      setEditingUser(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setEditSaving(false);
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────

  async function handleToggleActive(user: User) {
    setTogglingId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...user, isActive: !user.isActive }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated: User = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingId(null);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteConfirmId(null);
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  }

  // ── Reset password ────────────────────────────────────────────────────────

  function openResetPassword(u: User) {
    setResetUserId(u.id);
    setResetPassword("");
    setResetError(null);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetUserId) return;
    setResetting(true);
    setResetError(null);
    try {
      const res = await fetch(`/api/users/${resetUserId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? `HTTP ${res.status}`);
      setResetUserId(null);
    } catch (e) {
      setResetError(e instanceof Error ? e.message : "Failed to reset password");
    } finally {
      setResetting(false);
    }
  }

  // ── Filtered list ─────────────────────────────────────────────────────────

  const query = search.trim().toLowerCase();
  const filtered = query
    ? users.filter(
        (u) =>
          u.fullName.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.role.toLowerCase().includes(query)
      )
    : users;

  const deleteTarget = users.find((u) => u.id === deleteConfirmId);
  const resetTarget = users.find((u) => u.id === resetUserId);
  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-6 px-4 sm:py-10 sm:px-8">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage login accounts for administrators and teachers.
              </p>
            </div>
            <div className="flex items-center gap-4">
              {!loading && (
                <div className="text-sm text-gray-500 hidden sm:flex gap-4">
                  <span><span className="font-semibold text-gray-900">{users.length}</span> total</span>
                  <span className="text-emerald-600"><span className="font-semibold">{activeCount}</span> active</span>
                </div>
              )}
              <button onClick={openCreate} className={primaryBtnCls}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Create User
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
              <h2 className="text-base font-semibold text-gray-900 flex-1">
                All Users
                {!loading && (
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    ({filtered.length}{query ? ` of ${users.length}` : ""})
                  </span>
                )}
              </h2>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search name, email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none w-52"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
                <span className="text-sm">Loading users…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <svg className="w-10 h-10 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
                <p className="text-sm">{query ? `No users match "${search}".` : "No users yet."}</p>
                {query && <button onClick={() => setSearch("")} className="mt-2 text-sm text-blue-600 hover:underline">Clear search</button>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <Th>User</Th>
                      <Th>Role</Th>
                      <Th>Teacher Profile</Th>
                      <Th>Status</Th>
                      <Th>Joined</Th>
                      <Th>Actions</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold flex items-center justify-center flex-shrink-0 uppercase">
                              {user.fullName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{user.fullName}</p>
                              <p className="text-xs text-gray-400 truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                            {ROLE_LABELS[user.role]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {user.teacher ? (
                            <div>
                              <p className="font-medium text-gray-700">{user.teacher.subject}</p>
                              <p className="text-gray-400">{user.teacher.phone}</p>
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleActive(user)}
                            disabled={togglingId === user.id}
                            title={user.isActive ? "Click to deactivate" : "Click to activate"}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              user.isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                            }`}
                          >
                            {togglingId === user.id ? <Spinner /> : (
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                            )}
                            {user.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{formatDate(user.createdAt)}</td>
                        <td className="px-4 py-3">
                          {deletingId === user.id ? (
                            <span className="flex items-center gap-1 text-gray-400 text-xs"><Spinner /> Deleting…</span>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                onClick={() => openEdit(user)}
                                className="inline-flex items-center rounded border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => openResetPassword(user)}
                                className="inline-flex items-center rounded border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                              >
                                Reset Password
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(user.id)}
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

      {/* ── Create User Modal ───────────────────────────────────────────────── */}
      {showCreate && (
        <Backdrop onClick={() => setShowCreate(false)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Create User</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              {/* Role selector */}
              <div>
                <label className={labelCls}>Role <span className="text-red-500">*</span></label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value as UserRole }))}
                  className={inputCls}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="TEACHER">Teacher</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Aziz Karimov"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm((p) => ({ ...p, fullName: e.target.value }))}
                    required
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                    required
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Temporary Password <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    placeholder="Min. 6 characters"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                    required
                    minLength={6}
                    className={inputCls}
                  />
                </div>

                {/* Teacher-specific fields */}
                {createForm.role === "TEACHER" && (
                  <>
                    <div>
                      <label className={labelCls}>Phone <span className="text-red-500">*</span></label>
                      <input
                        type="tel"
                        placeholder="+998901234567"
                        value={createForm.phone}
                        onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                        required
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Subject <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. English, Math"
                        value={createForm.subject}
                        onChange={(e) => setCreateForm((p) => ({ ...p, subject: e.target.value }))}
                        required
                        className={inputCls}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Salary (UZS) <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="e.g. 3000000"
                        value={createForm.salary}
                        onChange={(e) => setCreateForm((p) => ({ ...p, salary: e.target.value }))}
                        required
                        className={inputCls}
                      />
                    </div>
                  </>
                )}
              </div>

              {createForm.role === "TEACHER" && (
                <p className="text-xs text-gray-500 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                  A Teacher record will be automatically created and linked to this account.
                </p>
              )}

              {createError && <ErrorPill message={createError} />}

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className={ghostBtnCls}>Cancel</button>
                <button type="submit" disabled={creating} className={primaryBtnCls}>
                  {creating && <Spinner />}
                  {creating ? "Creating…" : "Create User"}
                </button>
              </div>
            </form>
          </ModalCard>
        </Backdrop>
      )}

      {/* ── Edit Modal ──────────────────────────────────────────────────────── */}
      {editingUser && (
        <Backdrop onClick={() => setEditingUser(null)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Edit User</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editingUser.email}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
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
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as UserRole }))}
                  className={inputCls}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="TEACHER">Teacher</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">Account active</label>
              </div>
              {editError && <ErrorPill message={editError} />}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setEditingUser(null)} className={ghostBtnCls}>Cancel</button>
                <button type="submit" disabled={editSaving} className={primaryBtnCls}>
                  {editSaving && <Spinner />}
                  {editSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </ModalCard>
        </Backdrop>
      )}

      {/* ── Reset Password Modal ────────────────────────────────────────────── */}
      {resetUserId && resetTarget && (
        <Backdrop onClick={() => setResetUserId(null)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Reset Password</h2>
                <p className="text-xs text-gray-400 mt-0.5">{resetTarget.fullName}</p>
              </div>
              <button onClick={() => setResetUserId(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className={labelCls}>New Password <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  placeholder="Min. 6 characters"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                  className={inputCls}
                />
              </div>
              {resetError && <ErrorPill message={resetError} />}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setResetUserId(null)} className={ghostBtnCls}>Cancel</button>
                <button type="submit" disabled={resetting} className={primaryBtnCls}>
                  {resetting && <Spinner />}
                  {resetting ? "Resetting…" : "Reset Password"}
                </button>
              </div>
            </form>
          </ModalCard>
        </Backdrop>
      )}

      {/* ── Delete Confirmation ─────────────────────────────────────────────── */}
      {deleteConfirmId && deleteTarget && (
        <Backdrop onClick={() => setDeleteConfirmId(null)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Delete user?</h2>
                <p className="mt-1 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{deleteTarget.fullName}</span> ({deleteTarget.email}) will be permanently removed.
                  {deleteTarget.teacher && (
                    <span className="block mt-1 text-amber-700 text-xs">
                      The linked Teacher record will remain but will be unlinked from this account.
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setDeleteConfirmId(null)} className={ghostBtnCls}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirmId)} className={dangerBtnCls}>Delete User</button>
            </div>
          </ModalCard>
        </Backdrop>
      )}
    </>
  );
}
