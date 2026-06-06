import { createHmac, timingSafeEqual } from "crypto";
import type { WorkshopSlug } from "@/lib/workshop-keys";
import { DEFAULT_WORKSHOP, isWorkshopSlug } from "@/lib/workshop-keys";

/** ClickFunnels rechaza firmas más viejas que esto (docs oficiales). */
const CF_SIGNATURE_TOLERANCE_SEC = 600;

export type ClickFunnelsPurchase = {
  externalOrderId: string;
  email: string;
  name: string | null;
  phone: string | null;
  workshopSlug: WorkshopSlug;
  workshopDateId: string | null;
  raw: Record<string, unknown>;
};

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
    (pickNested(dataRoot, ["purchase", "contact"]) as Record<string, unknown> | undefined) ??
    (pickNested(raw, ["contact"]) as Record<string, unknown> | undefined) ??
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
      "event_id",
    ]) ??
    pickString(contact, ["id", "public_id"]) ??
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

  const workshopSlug: WorkshopSlug =
    workshopRaw && isWorkshopSlug(workshopRaw) ? workshopRaw : DEFAULT_WORKSHOP;

  const workshopDateId =
    pickString(raw, ["workshop_date_id", "date_id", "event_date_id"]) ??
    pickString(dataRoot, ["workshop_date_id", "date_id", "event_date_id"]) ??
    pickString(contact, ["workshop_date_id"]) ??
    (customAttrs ? pickString(customAttrs, ["workshop_date_id"]) : null) ??
    null;

  return {
    externalOrderId,
    email: email.toLowerCase(),
    name,
    phone,
    workshopSlug,
    workshopDateId,
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
