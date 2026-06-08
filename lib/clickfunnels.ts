import { createHmac, timingSafeEqual } from "crypto";
import type { WorkshopSlug } from "@/lib/workshop-keys";
import { isWorkshopSlug, resolveWorkshopFromFunnelText } from "@/lib/workshop-keys";

/** ClickFunnels rechaza firmas más viejas que esto (docs oficiales). */
export const CF_SIGNATURE_TOLERANCE_SEC = 600;

export type WebhookAuthDiagnosis = {
  reason:
    | "missing_secret"
    | "missing_cf_headers"
    | "invalid_timestamp"
    | "timestamp_skew"
    | "signature_mismatch"
    | "legacy_secret_mismatch"
    | "ok";
  hasCfSignature: boolean;
  hasCfTimestamp: boolean;
  timestampSkewSec: number | null;
};

export type ClickFunnelsPurchase = {
  externalOrderId: string;
  email: string;
  name: string | null;
  phone: string | null;
  /** null = funnel sin token reconocido; admin debe asignar taller en la app. */
  workshopSlug: WorkshopSlug | null;
  workshopDateId: string | null;
  /** Total de boletos en la orden (suma de line_items.quantity). */
  ticketQuantity: number;
  raw: Record<string, unknown>;
};

/** Suma quantity de line_items en payload V2; default 1. */
export function parseClickFunnelsTicketQuantity(
  raw: Record<string, unknown>
): number {
  const dataRoot =
    raw.data && typeof raw.data === "object"
      ? (raw.data as Record<string, unknown>)
      : raw;

  const lineItems = dataRoot.line_items ?? raw.line_items;
  if (!Array.isArray(lineItems)) return 1;

  let total = 0;
  for (const item of lineItems) {
    if (!item || typeof item !== "object") continue;
    const qty = (item as Record<string, unknown>).quantity;
    if (typeof qty === "number" && Number.isFinite(qty) && qty > 0) {
      total += Math.floor(qty);
    } else if (typeof qty === "string") {
      const n = Number.parseInt(qty, 10);
      if (Number.isFinite(n) && n > 0) total += n;
    }
  }

  return total > 0 ? total : 1;
}

export function guestExternalOrderId(
  baseOrderId: string,
  guestIndex: number
): string {
  return `${baseOrderId}:guest:${guestIndex}`;
}

/** Textos del funnel/página en payloads V2 (para UI y mapeo). */
export function extractClickFunnelsFunnelTexts(
  raw: Record<string, unknown>
): string[] {
  const dataRoot =
    raw.data && typeof raw.data === "object"
      ? (raw.data as Record<string, unknown>)
      : raw;

  const funnelObjectName = (root: Record<string, unknown>, key: string) => {
    const node = pickNested(root, [key]);
    return node && typeof node === "object"
      ? pickString(node as Record<string, unknown>, ["name"])
      : null;
  };

  return [
    pickString(dataRoot, ["funnel_name", "funnelName"]),
    pickString(raw, ["funnel_name", "funnelName"]),
    funnelObjectName(raw, "funnel"),
    funnelObjectName(dataRoot, "funnel"),
    pickString(dataRoot, ["origination_channel_name", "page_name"]),
    funnelObjectName(raw, "page"),
  ].filter((t): t is string => Boolean(t));
}

export function extractClickFunnelsFunnelLabel(
  raw: Record<string, unknown>
): string | null {
  const texts = extractClickFunnelsFunnelTexts(raw);
  return texts[0] ?? null;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

function pickNested(
  root: Record<string, unknown>,
  path: string[]
): unknown {
  let cur: unknown = root;
  for (const p of path) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/**
 * Parses ClickFunnels / Zapier-style webhook payloads flexibly.
 */
export function parseClickFunnelsPayload(body: unknown): ClickFunnelsPurchase | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;

  // ClickFunnels V2: { event_type, event_id, data: { ... } }
  const dataRoot =
    raw.data && typeof raw.data === "object"
      ? (raw.data as Record<string, unknown>)
      : raw;

  const contact =
    (pickNested(dataRoot, ["contact"]) as Record<string, unknown> | undefined) ??
    (pickNested(dataRoot, ["primary_contact"]) as Record<string, unknown> | undefined) ??
    (pickNested(dataRoot, ["purchase", "contact"]) as Record<string, unknown> | undefined) ??
    (pickNested(raw, ["contact"]) as Record<string, unknown> | undefined) ??
    (pickNested(raw, ["primary_contact"]) as Record<string, unknown> | undefined) ??
    (pickNested(raw, ["purchase", "contact"]) as Record<string, unknown> | undefined) ??
    dataRoot;

  const email =
    pickString(contact, ["email", "contact_email", "Email", "email_address"]) ??
    pickString(dataRoot, ["email", "contact_email", "buyer_email", "email_address"]) ??
    pickString(raw, ["email", "contact_email", "buyer_email", "email_address"]);

  if (!email) return null;

  const externalOrderId =
    pickString(dataRoot, [
      "id",
      "public_id",
      "order_id",
      "orderId",
      "purchase_id",
      "purchaseId",
      "transaction_id",
    ]) ??
    pickString(raw, [
      "id",
      "order_id",
      "orderId",
      "purchase_id",
      "purchaseId",
      "transaction_id",
    ]) ??
    pickString(contact, ["id", "public_id"]) ??
    pickString(raw, ["event_id"]) ??
    `cf-${email}-${Date.now()}`;

  const firstName = pickString(contact, ["first_name", "firstName", "name"]);
  const lastName = pickString(contact, ["last_name", "lastName"]);
  const name =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    pickString(contact, ["name", "full_name"]) ||
    pickString(raw, ["name", "full_name"]);

  const phone =
    pickString(contact, ["phone", "phone_number"]) ??
    pickString(raw, ["phone"]);

  const customAttrs =
    contact.custom_attributes && typeof contact.custom_attributes === "object"
      ? (contact.custom_attributes as Record<string, unknown>)
      : dataRoot.custom_attributes && typeof dataRoot.custom_attributes === "object"
        ? (dataRoot.custom_attributes as Record<string, unknown>)
        : null;

  const workshopRaw =
    pickString(raw, ["workshop", "workshop_slug", "w"]) ??
    pickString(dataRoot, ["workshop", "workshop_slug", "w"]) ??
    pickString(contact, ["workshop", "workshop_slug"]) ??
    pickString(raw, ["custom_workshop"]) ??
    (customAttrs ? pickString(customAttrs, ["workshop", "workshop_slug"]) : null) ??
    null;

  const funnelTexts = extractClickFunnelsFunnelTexts(raw);
  const workshopFromFunnel = resolveWorkshopFromFunnelText(...funnelTexts);

  const workshopSlug: WorkshopSlug | null =
    workshopRaw && isWorkshopSlug(workshopRaw)
      ? workshopRaw
      : workshopFromFunnel;

  const workshopDateId =
    pickString(raw, ["workshop_date_id", "date_id", "event_date_id"]) ??
    pickString(dataRoot, ["workshop_date_id", "date_id", "event_date_id"]) ??
    pickString(contact, ["workshop_date_id"]) ??
    (customAttrs ? pickString(customAttrs, ["workshop_date_id"]) : null) ??
    null;

  const ticketQuantity = parseClickFunnelsTicketQuantity(raw);

  return {
    externalOrderId,
    email: email.toLowerCase(),
    name,
    phone,
    workshopSlug,
    workshopDateId,
    ticketQuantity,
    raw,
  };
}

export function verifyWebhookSecret(
  request: Request,
  expected: string
): boolean {
  const header =
    request.headers.get("x-webhook-secret") ??
    request.headers.get("x-hernandez-pass-secret");
  if (header && header === expected) return true;

  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("secret");
    if (q && q === expected) return true;
  } catch {
    /* ignore */
  }

  return false;
}

/** Firma HMAC SHA256 oficial de ClickFunnels V2 webhooks. */
export function verifyClickFunnelsSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  if (!rawBody || !signature.trim() || !timestamp.trim() || !secret.trim()) {
    return false;
  }

  const timestampInt = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(timestampInt)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestampInt) > CF_SIGNATURE_TOLERANCE_SEC) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const sig = signature.trim().toLowerCase();
  const exp = expected.toLowerCase();
  if (sig.length !== exp.length) return false;

  try {
    return timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(exp, "utf8"));
  } catch {
    return false;
  }
}

/**
 * Autentica webhooks de ClickFunnels:
 * - V2 nativo: headers X-Webhook-ClickFunnels-Signature + Timestamp (HMAC)
 * - Legacy: X-Webhook-Secret o ?secret= (curl, Zapier)
 */
export function verifyIncomingWebhook(
  request: Request,
  secret: string,
  rawBody: string
): boolean {
  const cfSignature = request.headers.get("x-webhook-clickfunnels-signature");
  const cfTimestamp = request.headers.get("x-webhook-clickfunnels-timestamp");

  if (cfSignature && cfTimestamp) {
    return verifyClickFunnelsSignature(
      rawBody,
      cfSignature,
      cfTimestamp,
      secret
    );
  }

  return verifyWebhookSecret(request, secret);
}

/** Diagnóstico de fallos 401 sin exponer secretos. */
export function diagnoseWebhookAuthFailure(
  request: Request,
  secret: string,
  rawBody: string
): WebhookAuthDiagnosis {
  if (!secret.trim()) {
    return {
      reason: "missing_secret",
      hasCfSignature: false,
      hasCfTimestamp: false,
      timestampSkewSec: null,
    };
  }

  const cfSignature = request.headers.get("x-webhook-clickfunnels-signature");
  const cfTimestamp = request.headers.get("x-webhook-clickfunnels-timestamp");
  const hasCfSignature = Boolean(cfSignature?.trim());
  const hasCfTimestamp = Boolean(cfTimestamp?.trim());

  if (hasCfSignature && hasCfTimestamp) {
    const timestampInt = Number.parseInt(cfTimestamp!.trim(), 10);
    if (!Number.isFinite(timestampInt)) {
      return {
        reason: "invalid_timestamp",
        hasCfSignature,
        hasCfTimestamp,
        timestampSkewSec: null,
      };
    }

    const timestampSkewSec = Math.abs(
      Math.floor(Date.now() / 1000) - timestampInt
    );
    if (timestampSkewSec > CF_SIGNATURE_TOLERANCE_SEC) {
      return {
        reason: "timestamp_skew",
        hasCfSignature,
        hasCfTimestamp,
        timestampSkewSec,
      };
    }

    if (
      verifyClickFunnelsSignature(
        rawBody,
        cfSignature!,
        cfTimestamp!,
        secret
      )
    ) {
      return {
        reason: "ok",
        hasCfSignature,
        hasCfTimestamp,
        timestampSkewSec,
      };
    }

    return {
      reason: "signature_mismatch",
      hasCfSignature,
      hasCfTimestamp,
      timestampSkewSec,
    };
  }

  if (verifyWebhookSecret(request, secret)) {
    return {
      reason: "ok",
      hasCfSignature,
      hasCfTimestamp,
      timestampSkewSec: null,
    };
  }

  return {
    reason: hasCfSignature || hasCfTimestamp
      ? "signature_mismatch"
      : "legacy_secret_mismatch",
    hasCfSignature,
    hasCfTimestamp,
    timestampSkewSec: null,
  };
}
