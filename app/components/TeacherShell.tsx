"use client";

import { useState, useCallback } from "react";
import TeacherSidebar from "@/app/components/TeacherSidebar";
import { LanguageSwitcher } from "@/app/components/LanguageSwitcher";
import { NotificationBell } from "@/app/components/NotificationBell";

type TeacherShellUser = { fullName: string; email: string };

export default function TeacherShell({
  user,
  children,
}: {
  user: TeacherShellUser;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const close = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex min-h-screen">
      <TeacherSidebar user={user} isOpen={sidebarOpen} onClose={close} />

      {/* Mobile backdrop overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden ${
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={close}
        aria-hidden="true"
      />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 bg-white border-b border-gray-200 px-4 h-14 shadow-sm flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-1 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              T
            </div>
            <span className="text-sm font-semibold text-gray-900">Teacher Portal</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell href="/teacher/notifications" color="indigo" />
            <LanguageSwitcher />
          </div>
        </header>

        <main className="flex-1 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
