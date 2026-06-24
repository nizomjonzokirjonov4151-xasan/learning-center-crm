import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import type { SessionPayload } from "@/lib/session";

/**
 * Require an authenticated session, optionally restricted to a set of roles.
 * Returns the session on success, or a ready-to-return 401/403 NextResponse on failure.
 * Usage: `const auth = await requireSession(["ADMIN", "RECEPTION"]); if (auth instanceof NextResponse) return auth;`
 */
export async function requireSession(
  allowedRoles?: SessionPayload["role"][]
): Promise<SessionPayload | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}
