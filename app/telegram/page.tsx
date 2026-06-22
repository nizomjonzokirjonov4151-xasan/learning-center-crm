"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";

// ── Types ─────────────────────────────────────────────────────────────────────

type Settings = {
  botToken: string;
  adminChatId: string;
  isActive: boolean;
  hasToken: boolean;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";
type TestStatus = "idle" | "testing" | "success" | "error";
type ReportStatus = "idle" | "sending" | "sent" | "error";

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-gray-100 text-gray-500 border border-gray-200"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-gray-400"}`}
      />
      {active ? t.common.active : t.common.inactive}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TelegramPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Settings>({
    botToken: "",
    adminChatId: "",
    isActive: false,
    hasToken: false,
  });
  const [tokenInput, setTokenInput] = useState("");
  const [chatIdInput, setChatIdInput] = useState("");
  const [isActiveInput, setIsActiveInput] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const [testBotName, setTestBotName] = useState<string | null>(null);
  const [reportStatus, setReportStatus] = useState<ReportStatus>("idle");
  const [reportError, setReportError] = useState<string | null>(null);

  // ── Load settings ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/telegram/settings")
      .then((r) => r.json())
      .then((data: Settings) => {
        setSettings(data);
        setTokenInput(data.botToken);
        setChatIdInput(data.adminChatId);
        setIsActiveInput(data.isActive);
      })
      .catch(() => setLoadError("Failed to load Telegram settings."));
  }, []);

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/telegram/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: tokenInput,
          adminChatId: chatIdInput,
          isActive: isActiveInput,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveStatus("saved");
      // Reload to get updated masked token
      const updated = await fetch("/api/telegram/settings").then((r) => r.json());
      setSettings(updated);
      setTokenInput(updated.botToken);
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  }

  // ── Test connection ────────────────────────────────────────────────────────

  async function handleTest() {
    setTestStatus("testing");
    setTestError(null);
    setTestBotName(null);

    const tokenToTest =
      tokenInput && !tokenInput.startsWith("••") ? tokenInput : "";
    if (!tokenToTest || !chatIdInput) {
      setTestStatus("error");
      setTestError("Enter a bot token and chat ID before testing.");
      setTimeout(() => setTestStatus("idle"), 4000);
      return;
    }

    try {
      const res = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenToTest, chatId: chatIdInput }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestStatus("success");
        setTestBotName(data.botName ?? null);
        setTimeout(() => setTestStatus("idle"), 5000);
      } else {
        setTestStatus("error");
        setTestError(data.error ?? "Connection failed");
        setTimeout(() => setTestStatus("idle"), 5000);
      }
    } catch {
      setTestStatus("error");
      setTestError("Network error. Check server logs.");
      setTimeout(() => setTestStatus("idle"), 5000);
    }
  }

  // ── Manual daily report ────────────────────────────────────────────────────

  async function handleSendReport() {
    setReportStatus("sending");
    setReportError(null);
    try {
      const res = await fetch("/api/telegram/daily-report", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setReportStatus("sent");
        setTimeout(() => setReportStatus("idle"), 4000);
      } else {
        setReportStatus("error");
        setReportError(data.error ?? "Failed to send report");
        setTimeout(() => setReportStatus("idle"), 5000);
      }
    } catch {
      setReportStatus("error");
      setReportError("Network error");
      setTimeout(() => setReportStatus("idle"), 5000);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center flex-shrink-0 shadow-sm">
              {/* Telegram plane icon */}
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.281c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.94z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t.telegram.title}</h1>
              <p className="mt-1 text-sm text-gray-500">{t.telegram.subtitle}</p>
            </div>
          </div>
          <StatusBadge active={settings.isActive} />
        </div>

        {/* ── Load error ───────────────────────────────────────────────────── */}
        {loadError && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            {loadError}
          </div>
        )}

        {/* ── Settings card ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">{t.telegram.botConfiguration}</h2>
            <span className="text-xs text-gray-400">{t.telegram.settingsSaved}</span>
          </div>

          <div className="p-6 space-y-5">

            {/* Active toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <p className="text-sm font-semibold text-gray-800">{t.telegram.enableNotifications}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.telegram.enableDesc}</p>
              </div>
              <button
                onClick={() => setIsActiveInput((v) => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                  isActiveInput ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    isActiveInput ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Bot Token */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t.telegram.botToken}
                <span className="ml-1 text-xs font-normal text-gray-400">
                  {t.telegram.botTokenHint}
                </span>
              </label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="1234567890:ABCdefGHIjklmNOPqrstUVwxyz"
                  className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-xl text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title={showToken ? "Hide token" : "Show token"}
                >
                  {showToken ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
              {settings.hasToken && (
                <p className="mt-1.5 text-xs text-gray-400">{t.telegram.tokenSaved}</p>
              )}
            </div>

            {/* Chat ID */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t.telegram.chatId}
                <span className="ml-1 text-xs font-normal text-gray-400">
                  {t.telegram.chatIdHint}
                </span>
              </label>
              <input
                type="text"
                value={chatIdInput}
                onChange={(e) => setChatIdInput(e.target.value)}
                placeholder={t.telegram.chatIdPlaceholder}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-mono text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1.5 text-xs text-gray-400">
                Send <code className="bg-gray-100 px-1 rounded">/start</code> to your bot, then use{" "}
                <code className="bg-gray-100 px-1 rounded">@userinfobot</code> to find your chat ID.
              </p>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${
                saveStatus === "saved"
                  ? "bg-emerald-500 text-white"
                  : saveStatus === "error"
                  ? "bg-red-500 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {saveStatus === "saving" && (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t.telegram.saving}
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  {t.telegram.saved}
                </>
              )}
              {saveStatus === "error" && t.telegram.saveFailed}
              {saveStatus === "idle" && (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                  </svg>
                  {t.telegram.saveSettings}
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Test Connection card ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">{t.telegram.testConnection}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t.telegram.testDesc}</p>
          </div>
          <div className="p-6 space-y-4">

            {testStatus === "success" && (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <div>
                  <p className="font-semibold">{t.telegram.connectionSuccess}</p>
                  {testBotName && (
                    <p className="text-xs mt-0.5 text-emerald-600">
                      Bot <strong>@{testBotName}</strong> {t.telegram.botSentMessage}
                    </p>
                  )}
                </div>
              </div>
            )}

            {testStatus === "error" && testError && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <div>
                  <p className="font-semibold">{t.telegram.connectionFailed}</p>
                  <p className="text-xs mt-0.5 font-mono text-red-600 break-all">{testError}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleTest}
              disabled={testStatus === "testing"}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all border disabled:opacity-60 ${
                testStatus === "success"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : testStatus === "error"
                  ? "bg-red-50 border-red-300 text-red-700"
                  : "bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
              }`}
            >
              {testStatus === "testing" ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t.telegram.testing}
                </>
              ) : (
                <>
                  {/* Telegram icon */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.281c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.94z"/>
                  </svg>
                  {t.telegram.testTelegram}
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Daily Report card ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">{t.telegram.sendDailyReport}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t.telegram.dailyReportDesc}</p>
          </div>
          <div className="p-6 space-y-4">

            {/* What's included */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: "👥", label: t.analytics.totalStudents },
                { icon: "📁", label: t.analytics.totalGroups },
                { icon: "📋", label: t.dashboard.todaysAttendance },
                { icon: "💰", label: t.dashboard.paymentsThisMonth },
              ].map(({ icon, label }: { icon: string; label: string }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200"
                >
                  <span className="text-base">{icon}</span>
                  <span className="text-xs font-medium text-gray-600">{label}</span>
                </div>
              ))}
            </div>

            {reportStatus === "sent" && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                {t.telegram.reportSent}
              </div>
            )}

            {reportStatus === "error" && reportError && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.948 3.374H4.645c-1.73 0-2.813-1.874-1.948-3.374l7.25-12.879c.866-1.5 3.032-1.5 3.898 0l7.25 12.879ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                {reportError}
              </div>
            )}

            <button
              onClick={handleSendReport}
              disabled={reportStatus === "sending"}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              {reportStatus === "sending" ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t.telegram.sending}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                  </svg>
                  {t.telegram.sendNow}
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Notification events card ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">{t.telegram.eventNotifications}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t.telegram.eventNotificationsDesc}</p>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              {
                icon: "🎓",
                title: t.telegram.eventNewStudent,
                desc: t.telegram.eventNewStudentDesc,
                color: "bg-blue-50 text-blue-700",
              },
              {
                icon: "💰",
                title: t.telegram.eventNewPayment,
                desc: t.telegram.eventNewPaymentDesc,
                color: "bg-green-50 text-green-700",
              },
              {
                icon: "👨‍🏫",
                title: t.telegram.eventNewTeacher,
                desc: t.telegram.eventNewTeacherDesc,
                color: "bg-violet-50 text-violet-700",
              },
              {
                icon: "📁",
                title: t.telegram.eventNewGroup,
                desc: t.telegram.eventNewGroupDesc,
                color: "bg-amber-50 text-amber-700",
              },
            ].map(({ icon, title, desc, color }) => (
              <div key={title} className="flex items-start gap-4 px-6 py-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base ${color}`}>
                  {icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
                <div className="ml-auto flex-shrink-0">
                  <span className="text-xs font-medium px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                    {t.telegram.eventEnabled}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Setup guide ─────────────────────────────────────────────────── */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
            <h3 className="text-sm font-bold text-blue-800">{t.telegram.setupGuide}</h3>
          </div>
          <ol className="space-y-2 text-sm text-blue-700 list-decimal list-inside">
            <li>{t.telegram.setupStep1}</li>
            <li>{t.telegram.setupStep2}</li>
            <li>{t.telegram.setupStep3}</li>
            <li>{t.telegram.setupStep4}</li>
            <li>{t.telegram.setupStep5}</li>
            <li>{t.telegram.setupStep6}</li>
          </ol>
        </div>

      </div>
    </div>
  );
}
