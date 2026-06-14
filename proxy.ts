import { NextResponse, type NextRequest } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/lib/session";

// Pages accessible without login
const PUBLIC_ROUTES = ["/login", "/setup"];

// Routes blocked per role (ADMIN bypasses all restrictions)
const BLOCKED_FOR_MANAGER = ["/teachers", "/schedules", "/telegram", "/users"];
const BLOCKED_FOR_TEACHER = [
  "/students", "/payments", "/teachers", "/telegram",
  "/debtors", "/users", "/analytics", "/reports",
];

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

  // Authenticated users visiting /login → go home
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  // Force password change: lock user to the security page until they comply
  if (session.forcePasswordChange && !pathname.startsWith("/profile/security")) {
    return NextResponse.redirect(new URL("/profile/security", request.nextUrl));
  }

  // Role-based page access
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
