import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getServerTranslations } from "@/lib/i18n";
import ChangePasswordForm from "./ChangePasswordForm";

function parseDevice(userAgent: string | null): string {
  if (!userAgent) return "Unknown";
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
  return `${browser} / ${os}`;
}

export default async function SecurityPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { t, dateLocale } = await getServerTranslations();

  const activities = await prisma.loginActivity.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:py-10 sm:px-8">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.security.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{t.security.subtitle}</p>
        </div>

        {/* Force-change banner */}
        {session.forcePasswordChange && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">{t.security.forceChangeTitle}</p>
              <p className="text-sm text-amber-700 mt-0.5">{t.security.forceChangeDesc}</p>
            </div>
          </div>
        )}

        {/* Change Password */}
        <ChangePasswordForm forcePasswordChange={session.forcePasswordChange} />

        {/* Login Activity */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">{t.security.loginActivity}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{t.security.loginActivitySubtitle}</p>
          </div>

          {activities.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">
              {t.security.noActivity}
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {activities.map((activity) => (
                <li key={activity.id} className="px-6 py-4 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <p className="text-sm font-medium text-gray-900">
                        {parseDevice(activity.userAgent)}
                      </p>
                      <p className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(activity.createdAt).toLocaleDateString(dateLocale, {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.security.ipAddress}: {activity.ipAddress ?? t.security.unknown}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
