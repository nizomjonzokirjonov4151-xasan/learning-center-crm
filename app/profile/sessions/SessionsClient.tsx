"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth-actions";
import type { Translations } from "@/lib/i18n";

type SessionRow = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastSeenAt: string;
  createdAt: string;
  isCurrent: boolean;
};

type Props = {
  sessions: SessionRow[];
  t: Translations["sessions"];
};

function parseDevice(userAgent: string | null): { browser: string; os: string } {
  if (!userAgent) return { browser: "Browser", os: "Unknown" };
  const ua = userAgent.toLowerCase();
  const os = ua.includes("iphone") || ua.includes("ipad")
    ? "iOS"
    : ua.includes("android")
    ? "Android"
    : ua.includes("windows")
    ? "Windows"
    : ua.includes("mac")
    ? "macOS"
    : ua.includes("linux")
    ? "Linux"
    : "Unknown";
  const browser = ua.includes("edg/")
    ? "Edge"
    : ua.includes("chrome")
    ? "Chrome"
    : ua.includes("firefox")
    ? "Firefox"
    : ua.includes("safari")
    ? "Safari"
    : "Browser";
  return { browser, os };
}

function DeviceIcon({ userAgent }: { userAgent: string | null }) {
  const ua = (userAgent ?? "").toLowerCase();
  const isMobile = ua.includes("iphone") || ua.includes("android") || ua.includes("ipad");

  if (isMobile) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 15h3" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" />
    </svg>
  );
}

function relativeTime(isoString: string, t: Translations["sessions"]): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 2) return t.justNow;
  if (minutes < 60) return `${minutes} ${t.minutesAgo}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${t.hoursAgo}`;
  const days = Math.floor(hours / 24);
  return `${days} ${t.daysAgo}`;
}

function SessionCard({
  session,
  t,
  onRevoke,
}: {
  session: SessionRow;
  t: Translations["sessions"];
  onRevoke: (id: string) => Promise<void>;
}) {
  const [loading, startTransition] = useTransition();
  const { browser, os } = parseDevice(session.userAgent);

  return (
    <div className={`flex items-start gap-4 px-5 py-4 ${session.isCurrent ? "bg-blue-50/40" : ""}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${session.isCurrent ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
        <DeviceIcon userAgent={session.userAgent} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{browser} / {os}</p>
          {session.isCurrent && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {t.thisDevice}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {t.ipAddress}: {session.ipAddress ?? t.unknown}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {t.lastSeen}: {relativeTime(session.lastSeenAt, t)}
        </p>
      </div>

      {!session.isCurrent && (
        <button
          onClick={() => startTransition(() => onRevoke(session.id))}
          disabled={loading}
          className="flex-shrink-0 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? t.signingOut : t.signOutDevice}
        </button>
      )}
    </div>
  );
}

export default function SessionsClient({ sessions, t }: Props) {
  const router = useRouter();
  const [list, setList] = useState<SessionRow[]>(sessions);
  const [signingOutAll, startSignOutAll] = useTransition();

  const current = list.find((s) => s.isCurrent);
  const others = list.filter((s) => !s.isCurrent);

  async function revokeOne(id: string) {
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    setList((prev) => prev.filter((s) => s.id !== id));
  }

  function signOutOthers() {
    startSignOutAll(async () => {
      await fetch("/api/sessions", { method: "DELETE" });
      setList((prev) => prev.filter((s) => s.isCurrent));
    });
  }

  return (
    <div className="space-y-6">
      {/* Current device */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">{t.currentDevice}</h2>
        </div>
        {current ? (
          <div className="divide-y divide-gray-50">
            <SessionCard session={current} t={t} onRevoke={revokeOne} />
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-gray-400">—</p>
        )}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/60">
          <button
            onClick={() => logout()}
            className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
          >
            {t.signOutDevice}
          </button>
        </div>
      </div>

      {/* Other devices */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{t.otherDevices}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{others.length} {others.length === 1 ? "device" : "devices"}</p>
          </div>
          {others.length > 0 && (
            <button
              onClick={signOutOthers}
              disabled={signingOutAll}
              className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {signingOutAll ? t.signingOutOthers : t.signOutOthers}
            </button>
          )}
        </div>

        {others.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            {t.noOtherDevices}
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {others.map((s) => (
              <li key={s.id}>
                <SessionCard session={s} t={t} onRevoke={revokeOne} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
