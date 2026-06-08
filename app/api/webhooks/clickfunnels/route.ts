import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  diagnoseWebhookAuthFailure,
  extractClickFunnelsFunnelLabel,
  parseClickFunnelsPayload,
  verifyIncomingWebhook,
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
  buildBuyerPassUrl,
  createGuestInfoRequest,
} from "@/lib/guest-info";
import { processClickFunnelsPurchase } from "@/lib/registrations";
import {
  markWebhookEventFailed,
  markWebhookEventProcessed,
  trackIncomingWebhookEvent,
} from "@/lib/webhook-events";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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

    const purchase = parseClickFunnelsPayload(body);
    if (!purchase) {
      return NextResponse.json(
        { error: "Could not parse purchase payload (email required)" },
        { status: 400 }
      );
    }

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
      if (webhookEventId) {
        await markWebhookEventAwaitingWorkshop(webhookEventId);
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

      notifyOrganizationStaffAsync(org.id, {
        title: "¿A qué taller va esta compra?",
        body: `${who} — ${funnelLabel}`,
        data: {
          type: "workshop_pick",
          webhookEventId: webhookEventId ?? "",
        },
      });

      return NextResponse.json({
        ok: true,
        awaitingWorkshop: true,
        code: AWAITING_WORKSHOP_MARKER,
        webhookEventId,
        funnelLabel,
        trackingWarning: !tracking.ok ? tracking.reason : undefined,
      });
    }

    const result = await processClickFunnelsPurchase(purchase);

    if (!result.ok) {
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

    if (purchase.ticketQuantity > 1 && result.ok) {
      const registration = await prisma.registration.findUnique({
        where: { id: result.registrationId },
        select: { workshopDateId: true },
      });

      if (registration && purchase.workshopSlug) {
        const buyerPassUrl = result.passToken
          ? buildBuyerPassUrl(result.passToken)
          : `${process.env.APP_BASE_URL?.replace(/\/$/, "") ?? ""}/pass`;

        const guestRequest = await createGuestInfoRequest({
          organizationId: org.id,
          buyerRegistrationId: result.registrationId,
          purchase,
          workshopSlug: purchase.workshopSlug,
          workshopDateId: registration.workshopDateId,
          buyerPassUrl,
        });

        if (guestRequest.ok) {
          guestInfoUrl = guestRequest.guestInfoUrl;
        } else if (guestRequest.error !== "Guest request already exists") {
          console.warn("[clickfunnels webhook] guest info request failed", {
            externalOrderId: purchase.externalOrderId,
            error: guestRequest.error,
          });
        }
      }
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
