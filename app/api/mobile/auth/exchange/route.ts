import { NextResponse } from "next/server";
import {
  createSessionToken,
  resolveAuthForEmailInOrg,
  verifyMagicLinkToken,
} from "@/lib/auth";
import { getOrganizationBrandingById } from "@/lib/organization-branding";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const magic = await verifyMagicLinkToken(token);
  if (!magic) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const orgSlug = magic.organizationSlug ?? "";
  const resolved = await resolveAuthForEmailInOrg(magic.email, orgSlug);
  if (!resolved || !resolved.roles.includes(magic.intent)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const accessToken = await createSessionToken({
    email: magic.email,
    roles: resolved.roles,
    organizationId: resolved.organizationId,
    organizationSlug: resolved.organizationSlug,
    orgRole: resolved.orgRole,
  });

  if (!accessToken) {
    return NextResponse.json({ error: "Could not create session" }, { status: 500 });
  }

  const branding = await getOrganizationBrandingById(resolved.organizationId);

  const payload = {
    ok: true,
    accessToken,
    email: magic.email,
    roles: resolved.roles,
    orgRole: resolved.orgRole,
    organization: branding,
  };

  const wantsJson =
    url.searchParams.get("format") === "json" ||
    request.headers.get("accept")?.includes("application/json");

  if (wantsJson) {
    return NextResponse.json(payload);
  }

  const deepLink = `hernandezpass://auth?token=${encodeURIComponent(token)}`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta http-equiv="refresh" content="0;url=${deepLink}"/></head><body><p>Abriendo Hernandez Pass…</p><p><a href="${deepLink}">Toca aquí si no abre solo</a></p></body></html>`;
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  let body: { token?: unknown };
  try {
    body = (await request.json()) as { token?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const url = new URL(request.url);
  url.searchParams.set("token", token);
  return GET(new Request(url.toString(), { method: "GET" }));
}
