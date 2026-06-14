import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getServerTranslations } from "@/lib/i18n";
import ChangePasswordForm from "@/app/profile/security/ChangePasswordForm";

export default async function ParentProfilePage() {
  const session = await getSession();
  if (!session || session.role !== "PARENT") redirect("/login");

  const { t, dateLocale } = await getServerTranslations();

  const parent = await prisma.parent.findUnique({
    where: { userId: session.userId },
    select: { fullName: true, phone: true, email: true, createdAt: true },
  });

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:py-10 sm:px-8">
      <div className="max-w-3xl mx-auto space-y-8">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.parentPortal.profTitle}</h1>
          <p className="mt-1 text-sm text-gray-500">{t.parentPortal.profSubtitle}</p>
        </div>

        {/* Personal Info */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">{t.parentPortal.personalInfo}</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg uppercase flex-shrink-0">
                {(parent?.fullName ?? session.fullName).charAt(0)}
              </div>
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.users.fullName}</p>
                  <p className="mt-0.5 text-sm font-medium text-gray-900">{parent?.fullName ?? session.fullName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.parentPortal.phone}</p>
                  <p className="mt-0.5 text-sm text-gray-900">{parent?.phone ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.auth.emailLabel}</p>
                  <p className="mt-0.5 text-sm text-gray-900">{session.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.parentPortal.memberSince}</p>
                  <p className="mt-0.5 text-sm text-gray-900">
                    {parent
                      ? new Date(parent.createdAt).toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric" })
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <ChangePasswordForm forcePasswordChange={session.forcePasswordChange} />

      </div>
    </div>
  );
}
