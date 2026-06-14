import "server-only";
import { cookies } from "next/headers";
import { encrypt, decrypt, SESSION_COOKIE, type SessionPayload } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = await decrypt(token);
  if (!payload) return null;

  // Validate DB session and update lastSeenAt (only when sessionToken is present)
  if (payload.sessionToken) {
    try {
      const dbSession = await prisma.userSession.findUnique({
        where: { token: payload.sessionToken },
        select: { id: true },
      });
      // Session was revoked (signed out from another device / admin action)
      if (!dbSession) return null;

      // Fire-and-forget — does not block the response
      prisma.userSession
        .update({
          where: { token: payload.sessionToken },
          data: { lastSeenAt: new Date() },
        })
        .catch(() => {});
    } catch {
      // DB unavailable — allow the request (graceful degradation)
    }
  }

  return payload;
}

// Create JWT cookie only (no new DB session). Used when re-issuing after password change.
export async function createSessionCookie(payload: SessionPayload): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const jwtToken = await encrypt(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, jwtToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

// Create a tracked DB session + set the JWT cookie. Used on login.
export async function createSession(
  payload: Omit<SessionPayload, "sessionToken">,
  meta: { ipAddress: string | null; userAgent: string | null }
): Promise<void> {
  const sessionToken = crypto.randomUUID();

  await prisma.userSession.create({
    data: {
      userId: payload.userId,
      token: sessionToken,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      isCurrent: true,
    },
  });

  await createSessionCookie({ ...payload, sessionToken });
}

// Delete the JWT cookie and the corresponding DB session.
export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = await decrypt(raw);

  if (payload?.sessionToken) {
    await prisma.userSession
      .deleteMany({ where: { token: payload.sessionToken } })
      .catch(() => {});
  }

  cookieStore.delete(SESSION_COOKIE);
}
