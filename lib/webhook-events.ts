import { WebhookEventStatus, type WebhookEvent } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Prisma Json columns require plain JSON-serializable data. */
export function sanitizeJsonForPrisma(value: unknown): object {
  try {
    return JSON.parse(JSON.stringify(value ?? {})) as object;
  } catch {
    return {};
  }
}

export type WebhookEventTrackResult =
  | {
      ok: true;
      webhookEvent: WebhookEvent;
      duplicate: boolean;
    }
  | {
      ok: false;
      trackingDisabled: true;
      reason: string;
    };

export async function trackIncomingWebhookEvent(input: {
  organizationId: string;
  externalId: string;
  payload: unknown;
}): Promise<WebhookEventTrackResult> {
  const payload = sanitizeJsonForPrisma(input.payload);

  try {
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: {
        organizationId_provider_externalId: {
          organizationId: input.organizationId,
          provider: "clickfunnels",
          externalId: input.externalId,
        },
      },
    });

    if (existingEvent?.status === WebhookEventStatus.PROCESSED) {
      return { ok: true, webhookEvent: existingEvent, duplicate: true };
    }

    const preserveAwaitingError =
      existingEvent?.error === "AWAITING_WORKSHOP" ? "AWAITING_WORKSHOP" : null;

    const webhookEvent = await prisma.webhookEvent.upsert({
      where: {
        organizationId_provider_externalId: {
          organizationId: input.organizationId,
          provider: "clickfunnels",
          externalId: input.externalId,
        },
      },
      create: {
        organizationId: input.organizationId,
        provider: "clickfunnels",
        externalId: input.externalId,
        payload,
        status: WebhookEventStatus.RECEIVED,
      },
      update: {
        payload,
        status: WebhookEventStatus.RECEIVED,
        error: preserveAwaitingError,
      },
    });

    return { ok: true, webhookEvent, duplicate: false };
  } catch (err) {
    const reason =
      err instanceof Error ? err.message : "WebhookEvent tracking failed";
    console.error("[clickfunnels webhook] WebhookEvent DB error", {
      organizationId: input.organizationId,
      externalId: input.externalId,
      reason,
    });
    return { ok: false, trackingDisabled: true, reason };
  }
}

export async function markWebhookEventProcessed(
  webhookEventId: string,
  duplicate: boolean
): Promise<void> {
  try {
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: duplicate
          ? WebhookEventStatus.DUPLICATE
          : WebhookEventStatus.PROCESSED,
        processedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[clickfunnels webhook] markWebhookEventProcessed failed", err);
  }
}

export async function markWebhookEventFailed(
  webhookEventId: string,
  error: string
): Promise<void> {
  try {
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: WebhookEventStatus.FAILED,
        error,
      },
    });
  } catch (err) {
    console.error("[clickfunnels webhook] markWebhookEventFailed failed", err);
  }
}
