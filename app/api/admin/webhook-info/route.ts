import { NextResponse } from "next/server";
import { assertAdminApiAccess } from "@/lib/admin-api";
import {
  resolveWebhookSecretForOrganization,
  type WebhookSecretSource,
} from "@/lib/organization";

export const dynamic = "force-dynamic";

function getAppBaseUrl(request: Request): string {
  const fromEnv = process.env.APP_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}

async function getWebhookInfo(request: Request, organizationId: string) {
  const { prisma } = await import("@/lib/prisma");
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { slug: true },
  });

  const base = getAppBaseUrl(request);
  const orgSlug = org?.slug ?? "hernandez";
  const webhookUrl = `${base}/api/webhooks/clickfunnels?org=${encodeURIComponent(orgSlug)}`;
  const { secret, secretSource } =
    await resolveWebhookSecretForOrganization(organizationId);

  return {
    webhookUrl,
    secretConfigured: Boolean(secret),
    secretSource: secretSource as WebhookSecretSource | null,
    organizationSlug: orgSlug,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const legacyToken = url.searchParams.get("token");
  const auth = await assertAdminApiAccess(legacyToken, request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json(await getWebhookInfo(request, auth.organizationId));
}

export async function PATCH(request: Request) {
  const url = new URL(request.url);
  const legacyToken = url.searchParams.get("token");
  const auth = await assertAdminApiAccess(legacyToken, request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { clickfunnelsSecret?: string };
  try {
    body = (await request.json()) as { clickfunnelsSecret?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const secret = body.clickfunnelsSecret?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "clickfunnelsSecret is required" },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/prisma");
  await prisma.organization.update({
    where: { id: auth.organizationId },
    data: { clickfunnelsSecret: secret },
  });

  return NextResponse.json({
    ok: true,
    ...(await getWebhookInfo(request, auth.organizationId)),
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const legacyToken = url.searchParams.get("token");
  const auth = await assertAdminApiAccess(legacyToken, request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const info = await getWebhookInfo(request, auth.organizationId);
  const { secret } = await resolveWebhookSecretForOrganization(
    auth.organizationId
  );

  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        message: "Webhook secret no configurado",
      },
      { status: 422 }
    );
  }

  const testId = `admin-test-${Date.now()}`;
  const payload = {
    id: testId,
    email: `webhook-test+${testId}@example.com`,
    first_name: "Webhook",
    last_name: "Test",
    workshop: "duplica-ventas",
  };

  const res = await fetch(info.webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": secret,
    },
    body: JSON.stringify(payload),
  });

  let responseBody: unknown;
  try {
    responseBody = await res.json();
  } catch {
    responseBody = { error: "Non-JSON response" };
  }

  const message =
    res.status === 401
      ? "401 Unauthorized — el secreto no coincide con ClickFunnels"
      : res.status === 422
        ? "Auth OK — falta fecha activa del taller o datos inválidos"
        : res.ok
          ? "Webhook respondió correctamente"
          : `Error ${res.status}`;

  return NextResponse.json({
    ok: res.ok,
    status: res.status,
    message,
    response: responseBody,
    testExternalOrderId: testId,
  });
}
