import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  diagnoseWebhookAuthFailure,
  extractClickFunnelsFunnelLabel,
  parseClickFunnelsPayload,
  resolveForcedWorkshopFromRequest,
  verifyIncomingWebhook,
  summarizeWorkshopDetection,
  withForcedWorkshopSlug,
} from "@/lib/clickfunnels";
import {
  AWAITING_WORKSHOP_MARKER,
  markWebhookEventAwaitingWorkshop,
} from "@/lib/pending-purchases";
import {
  resolveOrganizationForWebhook,
  resolveWebhookSecretForOrganization,
} from "@/lib/organization";
import { notifyOrganizationStaffAsync } from "@/lib/notify-staff-push";
import {
  maybeCreateGuestInfoAfterPurchase,
} from "@/lib/guest-info";
import { processClickFunnelsPurchase } from "@/lib/registrations";
import {
  markWebhookEventFailed,
  markWebhookEventProcessed,
  trackIncomingWebhookEvent,
} from "@/lib/webhook-events";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rl = checkRateLimit(`cf-webhook:${clientIp(request)}`, 120, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  try {
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

    const { secret, secretSource } = await resolveWebhookSecretForOrganization(
      org.id
    );

    if (!secret) {
      return NextResponse.json(
        { error: "Webhook secret is not configured for this organization" },
        { status: 500 }
      );
    }

    const rawBody = await request.text();

    if (!verifyIncomingWebhook(request, secret, rawBody)) {
      const diagnosis = diagnoseWebhookAuthFailure(request, secret, rawBody);
      console.warn("[clickfunnels webhook] unauthorized", {
        org: org.slug,
        secretSource,
        ...diagnosis,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = parseClickFunnelsPayload(body);
    if (!parsed) {
      return NextResponse.json(
        { error: "Could not parse purchase payload (email required)" },
        { status: 400 }
      );
    }

    const forcedWorkshop = resolveForcedWorkshopFromRequest(request);
    const purchase = withForcedWorkshopSlug(parsed, forcedWorkshop);

    const tracking = await trackIncomingWebhookEvent({
      organizationId: org.id,
      externalId: purchase.externalOrderId,
      payload: purchase.raw,
    });

    if (tracking.ok && tracking.duplicate) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        externalOrderId: purchase.externalOrderId,
      });
    }

    const webhookEventId = tracking.ok ? tracking.webhookEvent.id : null;

    if (!purchase.workshopSlug) {
      const workshopDetection = summarizeWorkshopDetection(purchase.raw);
      const wasAlreadyAwaiting =
        tracking.ok && tracking.webhookEvent.error === AWAITING_WORKSHOP_MARKER;

      if (webhookEventId && !wasAlreadyAwaiting) {
        await markWebhookEventAwaitingWorkshop(webhookEventId);
      } else if (webhookEventId && wasAlreadyAwaiting) {
        // Marker preserved on upsert; no duplicate staff ping.
      } else if (!tracking.ok) {
        console.warn("[clickfunnels webhook] awaiting workshop without DB tracking", {
          org: org.slug,
          externalOrderId: purchase.externalOrderId,
          reason: tracking.reason,
        });
      }

      const funnelLabel =
        extractClickFunnelsFunnelLabel(purchase.raw) ?? "Funnel sin código";
      const who = purchase.name?.trim() || purchase.email;

      console.warn("[clickfunnels webhook] awaiting workshop assignment", {
        org: org.slug,
        externalOrderId: purchase.externalOrderId,
        email: purchase.email,
        funnelLabel,
        webhookEventId,
        workshopDetection,
      });

      if (!wasAlreadyAwaiting) {
        notifyOrganizationStaffAsync(org.id, {
          title: "¿A qué taller va esta compra?",
          body: `${who} — ${funnelLabel}`,
          data: {
            type: "workshop_pick",
            webhookEventId: webhookEventId ?? "",
          },
        });
      }

      return NextResponse.json({
        ok: true,
        awaitingWorkshop: true,
        missingWorkshop: true,
        resolution: "assign_workshop_in_admin",
        code: AWAITING_WORKSHOP_MARKER,
        webhookEventId,
        funnelLabel,
        email: purchase.email,
        externalOrderId: purchase.externalOrderId,
        workshopDetection,
        trackingWarning: !tracking.ok ? tracking.reason : undefined,
      });
    }

    const result = await processClickFunnelsPurchase(purchase, org.id);

    if (!result.ok) {
      console.warn("[clickfunnels webhook] registration failed", {
        org: org.slug,
        externalOrderId: purchase.externalOrderId,
        email: purchase.email,
        workshopSlug: purchase.workshopSlug,
        code: result.code,
        error: result.error,
      });
      if (webhookEventId) {
        await markWebhookEventFailed(
          webhookEventId,
          `${result.code}: ${result.error}`
        );
      }
      const status = result.code === "SOLD_OUT" ? 409 : 422;
      return NextResponse.json(
        { ok: false, error: result.error, code: result.code },
        { status }
      );
    }

    if (webhookEventId) {
      await markWebhookEventProcessed(webhookEventId, result.duplicate);
    } else if (!tracking.ok) {
      console.warn("[clickfunnels webhook] processed without WebhookEvent tracking", {
        org: org.slug,
        reason: tracking.reason,
        externalOrderId: purchase.externalOrderId,
      });
    }

    let guestInfoUrl: string | undefined;

    if (purchase.ticketQuantity > 1 && result.ok && !result.duplicate) {
      guestInfoUrl = await maybeCreateGuestInfoAfterPurchase({
        organizationId: org.id,
        purchase,
        registrationId: result.registrationId,
        passToken: result.passToken,
      });
    }

    if (!result.duplicate) {
      const who = purchase.name?.trim() || purchase.email;
      const guestNote =
        purchase.ticketQuantity > 1
          ? ` (${purchase.ticketQuantity} boletos; invitados pendientes)`
          : "";
      notifyOrganizationStaffAsync(org.id, {
        title: "Nuevo registro",
        body: `${who} se registró vía ClickFunnels${guestNote}`,
        data: { type: "registration", registrationId: result.registrationId },
      });
    }

    return NextResponse.json({
      ok: true,
      duplicate: result.duplicate,
      registrationId: result.registrationId,
      ticketQuantity: purchase.ticketQuantity,
      guestInfoUrl,
      passUrl: result.passToken
        ? `${process.env.APP_BASE_URL?.replace(/\/$/, "") ?? ""}/pass/${result.passToken}`
        : undefined,
      trackingWarning: !tracking.ok ? tracking.reason : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    console.error("[clickfunnels webhook] unhandled error", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
