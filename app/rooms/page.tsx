"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";

type Room = {
  id: string;
  name: string;
  capacity: number;
  floor: number;
  hasProjector: boolean;
  isActive: boolean;
  createdAt: string;
};

type FormState = {
  name: string;
  capacity: string;
  floor: string;
  hasProjector: boolean;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  capacity: "30",
  floor: "1",
  hasProjector: false,
  isActive: true,
};

type FilterStatus = "all" | "active" | "inactive";

function FloorLabel({ floor }: { floor: number }) {
  const label =
    floor === 0 ? "Ground" : floor === 1 ? "1st" : floor === 2 ? "2nd" : floor === 3 ? "3rd" : `${floor}th`;
  return <span>{label} floor</span>;
}

function Spinner({ size = "sm" }: { size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-6 w-6" : "h-4 w-4";
  return (
    <svg className={`animate-spin ${cls} text-current`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition";

export default function RoomsPage() {
  const { t, dateLocale } = useTranslation();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Room | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadRooms = useCallback(() => {
    setLoading(true);
    setPageError(null);
    fetch("/api/rooms")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRooms(data);
        } else {
          setPageError(data?.error ?? "Failed to load rooms.");
        }
      })
      .catch(() => setPageError("Network error. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // ── Derived lists ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = rooms;
    if (filterStatus === "active") list = list.filter((r) => r.isActive);
    if (filterStatus === "inactive") list = list.filter((r) => !r.isActive);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }
    return list;
  }, [rooms, filterStatus, search]);

  const stats = useMemo(
    () => ({
      total: rooms.length,
      active: rooms.filter((r) => r.isActive).length,
      inactive: rooms.filter((r) => !r.isActive).length,
      withProjector: rooms.filter((r) => r.hasProjector).length,
    }),
    [rooms]
  );

  // ── Modal helpers ────────────────────────────────────────────────────────
  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(room: Room) {
    setEditTarget(room);
    setForm({
      name: room.name,
      capacity: String(room.capacity),
      floor: String(room.floor),
      hasProjector: room.hasProjector,
      isActive: room.isActive,
    });
    setFormError("");
    setModalOpen(true);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    const name = form.name.trim();
    const capacity = parseInt(form.capacity, 10);
    const floor = parseInt(form.floor, 10);

    if (!name) { setFormError("Room name is required."); return; }
    if (!Number.isInteger(capacity) || capacity < 1) { setFormError("Capacity must be at least 1."); return; }
    if (!Number.isInteger(floor) || floor < 0) { setFormError("Floor must be 0 or greater."); return; }

    setSaving(true);
    setFormError("");
    try {
      const url = editTarget ? `/api/rooms/${editTarget.id}` : "/api/rooms";
      const method = editTarget ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, capacity, floor, hasProjector: form.hasProjector, isActive: form.isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Failed to save.");
        return;
      }
      if (editTarget) {
        setRooms((prev) => prev.map((r) => (r.id === editTarget.id ? data : r)));
      } else {
        setRooms((prev) => [data, ...prev]);
      }
      setModalOpen(false);
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/rooms/${deleteTarget.id}`, { method: "DELETE" });
      if (res.status === 204) {
        setRooms((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        setDeleteTarget(null);
        return;
      }
      const data = await res.json();
      setDeleteError(data.error ?? "Failed to delete.");
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Spinner size="md" />
          <p className="text-sm">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:py-10 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t.rooms.title}</h1>
            <p className="mt-1 text-sm text-gray-500">{t.rooms.subtitle}</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t.rooms.addRoom}
          </button>
        </div>

        {/* ── Page-level error ────────────────────────────────────────────── */}
        {pageError && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            {pageError}
          </div>
        )}

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t.rooms.totalRooms, value: stats.total, color: "bg-blue-50 border-blue-100", num: "text-blue-900", text: "text-blue-600" },
            { label: t.rooms.active, value: stats.active, color: "bg-emerald-50 border-emerald-100", num: "text-emerald-900", text: "text-emerald-600" },
            { label: t.rooms.inactive, value: stats.inactive, color: stats.inactive > 0 ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-200", num: stats.inactive > 0 ? "text-amber-900" : "text-gray-900", text: stats.inactive > 0 ? "text-amber-600" : "text-gray-400" },
            { label: t.rooms.withProjector, value: stats.withProjector, color: "bg-violet-50 border-violet-100", num: "text-violet-900", text: "text-violet-600" },
          ].map(({ label, value, color, num, text }) => (
            <div key={label} className={`rounded-2xl border p-4 shadow-sm ${color}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide ${text}`}>{label}</p>
              <p className={`text-3xl font-bold mt-1 ${num}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Search + Filter ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder={t.rooms.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>
          <div className="flex rounded-xl border border-gray-300 bg-white shadow-sm overflow-hidden">
            {(["all", "active", "inactive"] as FilterStatus[]).map((f, i) => {
              const labels: Record<FilterStatus, string> = { all: t.rooms.all, active: t.rooms.active, inactive: t.rooms.inactive };
              return (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors ${i < 2 ? "border-r border-gray-200" : ""} ${filterStatus === f ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Rooms grid ──────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-20 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 21V10.75m0 0 9-7.25m0 0 9 7.25" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                {rooms.length === 0 ? t.rooms.noRoomsYet : t.common.noData}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {rooms.length === 0 ? t.rooms.addFirstRoom : t.rooms.adjustFilter}
              </p>
            </div>
            {rooms.length === 0 && (
              <button
                onClick={openCreate}
                className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                {t.rooms.addFirstRoomCta}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((room) => (
              <div
                key={room.id}
                className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all group flex flex-col ${room.isActive ? "border-gray-200" : "border-gray-200 opacity-70"}`}
              >
                {/* Card header */}
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 21V10.75m0 0 9-7.25m0 0 9 7.25" />
                      </svg>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                        room.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {room.isActive ? t.rooms.active : t.rooms.inactive}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 leading-tight">{room.name}</h3>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                      </svg>
                      {t.rooms.capacity}: <span className="font-semibold text-gray-900">{room.capacity}</span> {t.rooms.capacityStudents}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                      </svg>
                      <FloorLabel floor={room.floor} />
                    </div>
                    <div className="flex items-center gap-2">
                      {room.hasProjector ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125h7.5c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m-1.5 3.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008ZM9.75 8.25h.008v.008H9.75V8.25Zm0 2.25h.008v.008H9.75v-.008Z" />
                          </svg>
                          {t.rooms.projector}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">{t.rooms.noProjector}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card footer */}
                <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between gap-2">
                  <time className="text-xs text-gray-400">
                    {t.rooms.added} {new Date(room.createdAt).toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" })}
                  </time>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(room)}
                      className="text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {t.common.edit}
                    </button>
                    <button
                      onClick={() => { setDeleteTarget(room); setDeleteError(""); }}
                      className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {t.common.delete}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ──────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                {editTarget ? t.rooms.editRoom : t.rooms.newRoom}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {formError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                  {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  {t.rooms.roomName} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t.rooms.roomNamePlaceholder}
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  className={inputCls}
                  autoFocus
                />
              </div>

              {/* Capacity + Floor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    {t.rooms.capacity} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    placeholder="30"
                    value={form.capacity}
                    onChange={(e) => setField("capacity", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    {t.rooms.floor} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    placeholder="1"
                    value={form.floor}
                    onChange={(e) => setField("floor", e.target.value)}
                    className={inputCls}
                  />
                  <p className="mt-1 text-xs text-gray-400">{t.rooms.floorHint}</p>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-1">
                {/* Has Projector */}
                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{t.rooms.hasProjector}</p>
                    <p className="text-xs text-gray-400">{t.rooms.projectorDesc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setField("hasProjector", !form.hasProjector)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                      form.hasProjector ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        form.hasProjector ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </label>

                {/* Is Active */}
                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{t.rooms.activeRoom}</p>
                    <p className="text-xs text-gray-400">{t.rooms.activeRoomDesc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setField("isActive", !form.isActive)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                      form.isActive ? "bg-emerald-500" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        form.isActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors flex items-center gap-2"
              >
                {saving && <Spinner />}
                {saving ? t.common.saving : editTarget ? t.rooms.editRoom : t.rooms.addRoom}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ─────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-1">{t.rooms.deleteRoom}</h3>
            <p className="text-sm text-gray-500 text-center mb-2">
              <span className="font-medium text-gray-700">{deleteTarget.name}</span> {t.rooms.deleteRoom}?
            </p>
            <p className="text-xs text-gray-400 text-center mb-5"></p>
            {deleteError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {deleteError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(""); }}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {deleting && <Spinner />}
                {deleting ? t.common.deleting : t.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
