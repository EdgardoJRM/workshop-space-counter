import { NextResponse } from "next/server";
import {
  createMagicLinkToken,
  resolveAuthForEmailInOrg,
  type AuthRole,
} from "@/lib/auth";
import { sendMagicLinkEmail } from "@/lib/auth-email";
import { getDefaultOrganization } from "@/lib/organization";
import { getOrganizationBrandingBySlug } from "@/lib/organization-branding";
import { isDatabaseConfigured } from "@/lib/prisma";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Body = {
  email?: unknown;
  orgSlug?: unknown;
  intent?: unknown;
};

function parseIntent(raw: unknown): AuthRole {
  return raw === "admin" ? "admin" : "staff";
}

export async function POST(request: Request) {
  const rl = checkRateLimit(`mobile-magic:${clientIp(request)}`, 8, 15 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const requestedOrgSlug =
    typeof body.orgSlug === "string" ? body.orgSlug.trim().toLowerCase() : "";
  const intent = parseIntent(body.intent);

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  let orgSlug = requestedOrgSlug;
  if (!orgSlug) {
    const defaultOrg = await getDefaultOrganization();
    if (!defaultOrg) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }
    orgSlug = defaultOrg.slug;
  }

  const branding = await getOrganizationBrandingBySlug(orgSlug);
  if (!branding) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const resolved = await resolveAuthForEmailInOrg(email, orgSlug);
  if (!resolved || !resolved.roles.includes(intent)) {
    return NextResponse.json({
      ok: true,
      message: "Si tu correo está autorizado, recibirás un enlace en breve.",
    });
  }

  const magicToken = await createMagicLinkToken(
    email,
    intent,
    "/mobile-auth-complete",
    orgSlug
  );
  if (!magicToken) {
    return NextResponse.json(
      { error: "AUTH_JWT_SECRET is not configured" },
      { status: 500 }
    );
  }

  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
  if (!base) {
    return NextResponse.json(
      { error: "APP_BASE_URL is not configured" },
      { status: 500 }
    );
  }

  const magicLink = `${base}/api/mobile/auth/exchange?token=${encodeURIComponent(magicToken)}`;
  const appDeepLink = `hernandezpass://auth?token=${encodeURIComponent(magicToken)}`;

  const intentLabel =
    intent === "staff"
      ? `${branding.appTitle} — Staff`
      : `${branding.appTitle} — Admin`;

  const sent = await sendMagicLinkEmail({
    to: email,
    magicLink,
    intentLabel,
  });

  if (!sent.ok) {
    return NextResponse.json({ error: sent.error }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    message: "Revisa tu correo para entrar a la app.",
    deepLinkHint: appDeepLink,
  });
}
