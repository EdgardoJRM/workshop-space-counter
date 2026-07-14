import { WebhookEventStatus } from "@prisma/client";
import {
  extractClickFunnelsFunnelLabel,
  parseClickFunnelsPayload,
  type ClickFunnelsPurchase,
} from "@/lib/clickfunnels";
import { prisma } from "@/lib/prisma";
import {
  processClickFunnelsPurchase,
  type ProcessPurchaseResult,
} from "@/lib/registrations";
import type { WorkshopSlug } from "@/lib/workshop-keys";
import { isWorkshopSlug } from "@/lib/workshop-keys";
import { markWebhookEventFailed, markWebhookEventProcessed } from "@/lib/webhook-events";
import { maybeCreateGuestInfoAfterPurchase } from "@/lib/guest-info";

export const AWAITING_WORKSHOP_MARKER = "AWAITING_WORKSHOP";

export type PendingPurchaseSummary = {
  id: string;
  externalOrderId: string;
  email: string;
  name: string | null;
  phone: string | null;
  funnelLabel: string | null;
  ticketQuantity: number;
  createdAt: string;
};

export function buildResolvedClickFunnelsPurchase(
  purchase: ClickFunnelsPurchase,
  workshopSlug: WorkshopSlug
): ClickFunnelsPurchase {
  return {
    ...purchase,
    workshopSlug,
  };
}

function payloadToSummary(
  event: { id: string; externalId: string; payload: unknown; createdAt: Date }
): PendingPurchaseSummary | null {
  const purchase = parseClickFunnelsPayload(event.payload);
  if (!purchase) return null;
  const raw =
    event.payload && typeof event.payload === "object"
      ? (event.payload as Record<string, unknown>)
      : purchase.raw;

  return {
    id: event.id,
    externalOrderId: event.externalId,
    email: purchase.email,
    name: purchase.name,
    phone: purchase.phone,
    funnelLabel: extractClickFunnelsFunnelLabel(raw),
    ticketQuantity: purchase.ticketQuantity,
    createdAt: event.createdAt.toISOString(),
  };
}

export function pendingPurchaseFromPayload(
  event: { id: string; externalId: string; payload: unknown; createdAt: Date }
): PendingPurchaseSummary | null {
  return payloadToSummary(event);
}

export async function listPendingPurchases(
  organizationId: string
): Promise<PendingPurchaseSummary[]> {
  const events = await prisma.webhookEvent.findMany({
    where: {
      organizationId,
      provider: "clickfunnels",
      status: WebhookEventStatus.RECEIVED,
      error: AWAITING_WORKSHOP_MARKER,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return events
    .map(payloadToSummary)
    .filter((row): row is PendingPurchaseSummary => row !== null);
}

export async function markWebhookEventAwaitingWorkshop(
  webhookEventId: string
): Promise<void> {
  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: { error: AWAITING_WORKSHOP_MARKER },
  });
}

export async function resolvePendingPurchase(input: {
  organizationId: string;
  webhookEventId: string;
  workshopSlug: string;
}): Promise<
  | ({ ok: true; guestInfoUrl?: string } & ProcessPurchaseResult)
  | { ok: false; error: string; code: string }
> {
  if (!isWorkshopSlug(input.workshopSlug)) {
    return { ok: false, error: "Invalid workshop", code: "INVALID_WORKSHOP" };
  }

  const event = await prisma.webhookEvent.findFirst({
    where: {
      id: input.webhookEventId,
      organizationId: input.organizationId,
      provider: "clickfunnels",
      status: WebhookEventStatus.RECEIVED,
      error: AWAITING_WORKSHOP_MARKER,
    },
  });

  if (!event) {
    return { ok: false, error: "Compra pendiente no encontrada", code: "NOT_FOUND" };
  }

  const purchase = parseClickFunnelsPayload(event.payload);
  if (!purchase) {
    await markWebhookEventFailed(event.id, "INVALID_PAYLOAD");
    return { ok: false, error: "Payload inválido", code: "INVALID_PAYLOAD" };
  }

  const resolved = buildResolvedClickFunnelsPurchase(
    purchase,
    input.workshopSlug
  );

  const result = await processClickFunnelsPurchase(resolved, input.organizationId);

  if (!result.ok) {
    console.warn("[pending-purchases] resolve failed", {
      organizationId: input.organizationId,
      webhookEventId: input.webhookEventId,
      workshopSlug: input.workshopSlug,
      code: result.code,
      error: result.error,
    });
    await markWebhookEventFailed(
      event.id,
      `${result.code}: ${result.error}`
    );
    return result;
  }

  await markWebhookEventProcessed(event.id, result.duplicate);

  let guestInfoUrl: string | undefined;
  if (resolved.ticketQuantity > 1 && result.ok && !result.duplicate) {
    guestInfoUrl = await maybeCreateGuestInfoAfterPurchase({
      organizationId: input.organizationId,
      purchase: resolved,
      registrationId: result.registrationId,
      passToken: result.passToken,
    });
  }

  return { ...result, guestInfoUrl };
}
