import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getServerTranslations } from "@/lib/i18n";
import SessionsClient from "./SessionsClient";

export default async function SessionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { t } = await getServerTranslations();

  const dbSessions = await prisma.userSession.findMany({
    where: { userId: session.userId },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      lastSeenAt: true,
      createdAt: true,
      token: true,
    },
  });

  const sessions = dbSessions.map((s) => ({
    id: s.id,
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
    lastSeenAt: s.lastSeenAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
    isCurrent: s.token === session.sessionToken,
  }));

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:py-10 sm:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.sessions.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{t.sessions.subtitle}</p>
        </div>
        <SessionsClient sessions={sessions} t={t.sessions} />
      </div>
    </div>
  );
}
