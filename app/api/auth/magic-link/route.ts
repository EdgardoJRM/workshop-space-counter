import { NextResponse } from "next/server";
import {
  createMagicLinkToken,
  resolveAuthForEmail,
  type AuthRole,
} from "@/lib/auth";
import { sendMagicLinkEmail } from "@/lib/auth-email";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Body = {
  email?: unknown;
  intent?: unknown;
  next?: unknown;
};

function parseIntent(raw: unknown): AuthRole {
  return raw === "staff" ? "staff" : "admin";
}

function safeNextPath(raw: unknown, intent: AuthRole): string {
  if (typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return intent === "staff" ? "/staff/scan" : "/admin";
}

export async function POST(request: Request) {
  const rl = checkRateLimit(`magic:${clientIp(request)}`, 8, 15 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const intent = parseIntent(body.intent);
  const resolved = await resolveAuthForEmail(email);

  if (!resolved || !resolved.roles.includes(intent)) {
    return NextResponse.json({
      ok: true,
      message: "Si tu correo está autorizado, recibirás un enlace en breve.",
    });
  }

  const nextPath = safeNextPath(body.next, intent);
  const magicToken = await createMagicLinkToken(
    email,
    intent,
    nextPath,
    resolved.organizationSlug
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

  const magicLink = `${base}/api/auth/callback?token=${encodeURIComponent(magicToken)}`;

  const intentLabel = intent === "staff" ? "Staff / Scanner" : "Administración";
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
    message: "Si tu correo está autorizado, recibirás un enlace en breve.",
  });
}
