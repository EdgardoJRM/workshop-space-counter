import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  canAccessStaff,
  hasRole,
  verifySessionToken,
} from "@/lib/session-token";

const SESSION_COOKIE = "hp_session";

function loginRedirect(request: NextRequest, intent: "admin" | "staff", next: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?intent=${intent}&next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (pathname.startsWith("/admin")) {
    if (!session || !hasRole(session, "admin")) {
      return loginRedirect(request, "admin", pathname);
    }
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/staff/scan") ||
    pathname.startsWith("/staff/print-station")
  ) {
    if (!session || !canAccessStaff(session)) {
      return loginRedirect(request, "staff", pathname);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/staff/scan",
    "/staff/scan/:path*",
    "/staff/print-station",
    "/staff/print-station/:path*",
  ],
};
