import { NextResponse } from "next/server";
import { assertAdminApiAccess } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

function getAppBaseUrl(request: Request): string {
  const fromEnv = process.env.APP_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const legacyToken = url.searchParams.get("token");
  const auth = await assertAdminApiAccess(legacyToken);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { prisma } = await import("@/lib/prisma");
  const org = await prisma.organization.findUnique({
    where: { id: auth.organizationId },
    select: { slug: true, clickfunnelsSecret: true },
  });

  const base = getAppBaseUrl(request);
  const orgSlug = org?.slug ?? "hernandez";
  const webhookUrl = `${base}/api/webhooks/clickfunnels?org=${encodeURIComponent(orgSlug)}`;
  const secretConfigured = Boolean(
    org?.clickfunnelsSecret?.trim() ||
      process.env.CLICKFUNNELS_WEBHOOK_SECRET?.trim()
  );

  return NextResponse.json({ webhookUrl, secretConfigured, organizationSlug: orgSlug });
}
