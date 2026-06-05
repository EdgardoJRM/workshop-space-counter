import { NextResponse } from "next/server";
import { WebhookEventStatus } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  parseClickFunnelsPayload,
  verifyWebhookSecret,
} from "@/lib/clickfunnels";
import { resolveOrganizationForWebhook } from "@/lib/organization";
import { processClickFunnelsPurchase } from "@/lib/registrations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  const org = await resolveOrganizationForWebhook(request);
  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  const orgRow = await prisma.organization.findUnique({
    where: { id: org.id },
  });
  const secret =
    orgRow?.clickfunnelsSecret?.trim() ||
    process.env.CLICKFUNNELS_WEBHOOK_SECRET?.trim();

  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret is not configured for this organization" },
      { status: 500 }
    );
  }

  if (!verifyWebhookSecret(request, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const purchase = parseClickFunnelsPayload(body);
  if (!purchase) {
    return NextResponse.json(
      { error: "Could not parse purchase payload (email required)" },
      { status: 400 }
    );
  }

  const existingEvent = await prisma.webhookEvent.findUnique({
    where: {
      organizationId_provider_externalId: {
        organizationId: org.id,
        provider: "clickfunnels",
        externalId: purchase.externalOrderId,
      },
    },
  });

  if (existingEvent?.status === WebhookEventStatus.PROCESSED) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      externalOrderId: purchase.externalOrderId,
    });
  }

  const webhookEvent = await prisma.webhookEvent.upsert({
    where: {
      organizationId_provider_externalId: {
        organizationId: org.id,
        provider: "clickfunnels",
        externalId: purchase.externalOrderId,
      },
    },
    create: {
      organizationId: org.id,
      provider: "clickfunnels",
      externalId: purchase.externalOrderId,
      payload: purchase.raw as object,
      status: WebhookEventStatus.RECEIVED,
    },
    update: {
      payload: purchase.raw as object,
      status: WebhookEventStatus.RECEIVED,
      error: null,
    },
  });

  try {
    const result = await processClickFunnelsPurchase(purchase);

    if (!result.ok) {
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: WebhookEventStatus.FAILED,
          error: `${result.code}: ${result.error}`,
        },
      });
      const status = result.code === "SOLD_OUT" ? 409 : 422;
      return NextResponse.json(
        { ok: false, error: result.error, code: result.code },
        { status }
      );
    }

    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        status: result.duplicate
          ? WebhookEventStatus.DUPLICATE
          : WebhookEventStatus.PROCESSED,
        processedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      duplicate: result.duplicate,
      registrationId: result.registrationId,
      passUrl: result.passToken
        ? `${process.env.APP_BASE_URL?.replace(/\/$/, "") ?? ""}/pass/${result.passToken}`
        : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        status: WebhookEventStatus.FAILED,
        error: message,
      },
    });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
