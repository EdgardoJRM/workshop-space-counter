import { NextResponse } from "next/server";
import { WebhookEventStatus } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  parseClickFunnelsPayload,
  verifyWebhookSecret,
} from "@/lib/clickfunnels";
import { processClickFunnelsPurchase } from "@/lib/registrations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.CLICKFUNNELS_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "CLICKFUNNELS_WEBHOOK_SECRET is not configured" },
      { status: 500 }
    );
  }

  if (!verifyWebhookSecret(request, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
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
      provider_externalId: {
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
      provider_externalId: {
        provider: "clickfunnels",
        externalId: purchase.externalOrderId,
      },
    },
    create: {
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
