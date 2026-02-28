import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"];
const OWNER_PATHS = ["/owner"];
const ADMIN_PATHS = ["/admin"];

function getRole(request: NextRequest): string | null {
  return request.cookies.get("stayease-role")?.value ?? null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and Next.js internals
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Root: redirect to login
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = getRole(request);

  // Not authenticated — redirect to login
  if (!role) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Owner-only routes — owner and admin can both access
  if (OWNER_PATHS.some((p) => pathname.startsWith(p))) {
    if (role !== "owner" && role !== "admin") {
      return NextResponse.redirect(new URL("/login?error=forbidden", request.url));
    }
  }

  // Admin-only routes
  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/owner/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
