import { NextResponse, type NextRequest } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/lib/session";

// Pages accessible without login
const PUBLIC_ROUTES = ["/login", "/setup"];

// Routes blocked per role (ADMIN bypasses all restrictions)
const BLOCKED_FOR_MANAGER = ["/teachers", "/schedules", "/telegram", "/users", "/parents"];
const BLOCKED_FOR_TEACHER = [
  "/students", "/payments", "/teachers", "/telegram",
  "/debtors", "/users", "/analytics", "/reports", "/parents",
];

// PARENT can only access these prefixes (everything else redirects to /parent/dashboard)
const ALLOWED_FOR_PARENT = ["/parent", "/profile"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes unconditionally
  if (PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return NextResponse.next();
  }

  // Decode session from cookie
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await decrypt(token);

  // Unauthenticated → send to login, preserving the intended destination
  if (!session) {
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated users visiting /login → send to appropriate home
  if (pathname === "/login") {
    const home = session.role === "PARENT" ? "/parent/dashboard" : "/";
    return NextResponse.redirect(new URL(home, request.nextUrl));
  }

  // Force password change: lock user to the security page until they comply
  if (session.forcePasswordChange && !pathname.startsWith("/profile/security")) {
    return NextResponse.redirect(new URL("/profile/security", request.nextUrl));
  }

  // ── PARENT: whitelist-only access ──────────────────────────────────────────
  if (session.role === "PARENT") {
    const allowed = ALLOWED_FOR_PARENT.some((r) => pathname === r || pathname.startsWith(r + "/"));
    if (!allowed) {
      return NextResponse.redirect(new URL("/parent/dashboard", request.nextUrl));
    }
    return NextResponse.next();
  }

  // ── Non-PARENT: block access to /parent/* ──────────────────────────────────
  if (pathname === "/parent" || pathname.startsWith("/parent/")) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  // Role-based page access for staff
  if (session.role === "MANAGER") {
    if (BLOCKED_FOR_MANAGER.some((r) => pathname.startsWith(r))) {
      return NextResponse.redirect(new URL("/", request.nextUrl));
    }
  }

  if (session.role === "TEACHER") {
    if (BLOCKED_FOR_TEACHER.some((r) => pathname.startsWith(r))) {
      return NextResponse.redirect(new URL("/", request.nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except API, static files, and images
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
