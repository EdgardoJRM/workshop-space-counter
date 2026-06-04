import type { WorkshopSlug } from "@/lib/workshop-keys";
import { DEFAULT_WORKSHOP, isWorkshopSlug } from "@/lib/workshop-keys";

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

  const contact =
    (pickNested(raw, ["contact"]) as Record<string, unknown> | undefined) ??
    (pickNested(raw, ["purchase", "contact"]) as Record<string, unknown> | undefined) ??
    raw;

  const email =
    pickString(contact, ["email", "contact_email", "Email"]) ??
    pickString(raw, ["email", "contact_email", "buyer_email"]);

  if (!email) return null;

  const externalOrderId =
    pickString(raw, [
      "id",
      "order_id",
      "orderId",
      "purchase_id",
      "purchaseId",
      "transaction_id",
    ]) ?? pickString(contact, ["id"]) ?? `cf-${email}-${Date.now()}`;

  const firstName = pickString(contact, ["first_name", "firstName", "name"]);
  const lastName = pickString(contact, ["last_name", "lastName"]);
  const name =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    pickString(contact, ["name", "full_name"]) ||
    pickString(raw, ["name", "full_name"]);

  const phone =
    pickString(contact, ["phone", "phone_number"]) ??
    pickString(raw, ["phone"]);

  const workshopRaw =
    pickString(raw, ["workshop", "workshop_slug", "w"]) ??
    pickString(contact, ["workshop", "workshop_slug"]) ??
    pickString(raw, ["custom_workshop"]) ??
    null;

  const workshopSlug: WorkshopSlug =
    workshopRaw && isWorkshopSlug(workshopRaw) ? workshopRaw : DEFAULT_WORKSHOP;

  const workshopDateId =
    pickString(raw, ["workshop_date_id", "date_id", "event_date_id"]) ??
    pickString(contact, ["workshop_date_id"]) ??
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
