import { NextResponse } from "next/server";
import {
  createSessionToken,
  resolveAuthForEmail,
  setSessionCookie,
  verifyMagicLinkToken,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", request.url));
  }

  const magic = await verifyMagicLinkToken(token);
  if (!magic) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
  }

  const resolved = await resolveAuthForEmail(magic.email);
  if (!resolved || !resolved.roles.includes(magic.intent)) {
    return NextResponse.redirect(new URL("/login?error=not_authorized", request.url));
  }

  const sessionToken = await createSessionToken({
    email: magic.email,
    roles: resolved.roles,
    organizationId: resolved.organizationId,
    organizationSlug: resolved.organizationSlug,
    orgRole: resolved.orgRole,
  });
  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login?error=server", request.url));
  }

  await setSessionCookie(sessionToken);

  const redirectTo = magic.next.startsWith("/") ? magic.next : "/admin";
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
