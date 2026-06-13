"use client";

import { useState, useEffect, useCallback } from "react";

type Group = {
  id: string;
  name: string;
  description: string | null;
  monthlyFee: number;
  createdAt: string;
  _count: { students: number };
};

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none";
const primaryBtnCls =
  "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors";
const ghostBtnCls =
  "inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
      {children}
    </th>
  );
}

function ErrorPill({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
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

function ModalCard({ children, onClick }: { children: React.ReactNode; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <div
      className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StudentBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-100">
      {count} {count === 1 ? "student" : "students"}
    </span>
  );
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMonthlyFee, setNewMonthlyFee] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMonthlyFee, setEditMonthlyFee] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setGroups(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setEditingGroup(null);
      setDeleteConfirmId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || null,
          monthlyFee: newMonthlyFee ? parseFloat(newMonthlyFee) : 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? data.error ?? `HTTP ${res.status}`);
      }
      setNewName("");
      setNewDescription("");
      setNewMonthlyFee("");
      await fetchGroups();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to create group");
    } finally {
      setAdding(false);
    }
  }

  function openEdit(group: Group) {
    setEditingGroup(group);
    setEditName(group.name);
    setEditDescription(group.description ?? "");
    setEditMonthlyFee(group.monthlyFee > 0 ? String(group.monthlyFee) : "");
    setEditError(null);
  }

  function closeEdit() {
    setEditingGroup(null);
    setEditError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingGroup || !editName.trim()) return;
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/groups/${editingGroup.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          monthlyFee: editMonthlyFee ? parseFloat(editMonthlyFee) : 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? data.error ?? `HTTP ${res.status}`);
      }
      closeEdit();
      await fetchGroups();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteConfirmId(null);
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
      await fetchGroups();
    } finally {
      setDeletingId(null);
    }
  }

  const confirmGroup = deleteConfirmId
    ? groups.find((g) => g.id === deleteConfirmId)
    : null;

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-10 px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
            <p className="mt-1 text-sm text-gray-500">
              Organize your students into learning groups.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Add New Group
            </h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="name" className={labelCls}>
                    Group Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    placeholder="e.g. Morning English A1"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="description" className={labelCls}>
                    Description{" "}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="description"
                    type="text"
                    placeholder="e.g. Weekdays 09:00–11:00"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="monthlyFee" className={labelCls}>
                    Monthly Fee (UZS){" "}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="monthlyFee"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="e.g. 500000"
                    value={newMonthlyFee}
                    onChange={(e) => setNewMonthlyFee(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              {addError && <ErrorPill message={addError} />}
              <div className="flex justify-end">
                <button type="submit" disabled={adding} className={primaryBtnCls}>
                  {adding && <Spinner />}
                  {adding ? "Adding…" : "Add Group"}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">All Groups</h2>
              <span className="text-sm text-gray-400">
                {!loading && `${groups.length} group${groups.length !== 1 ? "s" : ""}`}
              </span>
            </div>

            {error && (
              <div className="p-6">
                <ErrorPill message={error} />
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
                <Spinner />
                <span className="text-sm">Loading groups…</span>
              </div>
            ) : groups.length === 0 && !error ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <svg className="w-10 h-10 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25A2.25 2.25 0 0 0 4.5 16.5h15a2.25 2.25 0 0 0 2.25-2.25V8.25A2.25 2.25 0 0 0 19.5 6h-5.69a1.5 1.5 0 0 1-1.06-.44Z" />
                </svg>
                <p className="text-sm">No groups yet. Add your first group above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <Th>Group Name</Th>
                      <Th>Description</Th>
                      <Th>Monthly Fee</Th>
                      <Th>Students</Th>
                      <Th>Created</Th>
                      <Th>Actions</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {groups.map((group) => (
                      <tr key={group.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {group.name}
                        </td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                          {group.description ?? (
                            <span className="text-gray-300 italic">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {group.monthlyFee > 0 ? (
                            <span className="font-medium">
                              {new Intl.NumberFormat("en-US").format(group.monthlyFee)} UZS
                            </span>
                          ) : (
                            <span className="text-gray-300 italic">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StudentBadge count={group._count.students} />
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {formatDate(group.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          {deletingId === group.id ? (
                            <span className="flex items-center gap-1 text-gray-400 text-xs">
                              <Spinner /> Deleting…
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEdit(group)}
                                className={ghostBtnCls}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(group.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors"
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

      {editingGroup && (
        <Backdrop onClick={closeEdit}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Edit Group</h2>
              <button
                onClick={closeEdit}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className={labelCls}>
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  autoFocus
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Description{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  placeholder="Group schedule, level, or any notes"
                  className={inputCls + " resize-none"}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Monthly Fee (UZS){" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="e.g. 500000"
                  value={editMonthlyFee}
                  onChange={(e) => setEditMonthlyFee(e.target.value)}
                  className={inputCls}
                />
              </div>
              {editError && <ErrorPill message={editError} />}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={closeEdit} className={ghostBtnCls}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className={primaryBtnCls}>
                  {saving && <Spinner />}
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </ModalCard>
        </Backdrop>
      )}

      {deleteConfirmId && confirmGroup && (
        <Backdrop onClick={() => setDeleteConfirmId(null)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Delete group?</h2>
                <p className="mt-1 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{confirmGroup.name}</span>{" "}
                  will be permanently deleted.
                  {confirmGroup._count.students > 0 && (
                    <span className="block mt-1 text-amber-600">
                      {confirmGroup._count.students} student
                      {confirmGroup._count.students !== 1 ? "s" : ""} will be unassigned from this group.
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className={ghostBtnCls}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                Delete Group
              </button>
            </div>
          </ModalCard>
        </Backdrop>
      )}
    </>
  );
}
