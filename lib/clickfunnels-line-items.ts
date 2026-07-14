/** Productos OTO / bump del funnel que no son boletos de taller. */
const OTO_PRODUCT_PATTERNS = [
  "segmentacion",
  "segmentación",
  "segmentation",
  "libro",
  "ebook",
  "e-book",
  " order bump",
  "order bump",
  " bump",
  "upsell",
  " oto",
  "oto ",
  "workbook",
  "guia ",
  "guía ",
  "digital download",
  "descarga digital",
];

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

export function getClickFunnelsLineItems(
  raw: Record<string, unknown>
): Record<string, unknown>[] {
  const dataRoot =
    raw.data && typeof raw.data === "object"
      ? (raw.data as Record<string, unknown>)
      : raw;

  const lineItems = dataRoot.line_items ?? raw.line_items;
  if (!Array.isArray(lineItems)) return [];

  return lineItems.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object"
  );
}

export function getLineItemProductName(item: Record<string, unknown>): string {
  const original = item.original_product;
  if (original && typeof original === "object") {
    const fromProduct = pickString(original as Record<string, unknown>, [
      "name",
      "title",
      "product_name",
    ]);
    if (fromProduct) return fromProduct;
  }

  const fromItem = pickString(item, [
    "product_name",
    "name",
    "title",
    "description",
  ]);
  return fromItem ?? "";
}

export function parseLineItemQuantity(item: Record<string, unknown>): number {
  const qty = item.quantity;
  if (typeof qty === "number" && Number.isFinite(qty) && qty > 0) {
    return Math.floor(qty);
  }
  if (typeof qty === "string") {
    const n = Number.parseInt(qty, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 1;
}

export function isOtoOrNonWorkshopLineItem(productName: string): boolean {
  const normalized = productName.trim().toLowerCase();
  if (!normalized) return false;
  return OTO_PRODUCT_PATTERNS.some((pattern) => normalized.includes(pattern));
}

/** Cuenta solo boletos de taller; excluye OTOs como el libro de segmentación. */
export function parseWorkshopTicketQuantity(
  raw: Record<string, unknown>
): number {
  const lineItems = getClickFunnelsLineItems(raw);
  if (lineItems.length === 0) return 1;

  let workshopQty = 0;

  for (const item of lineItems) {
    const qty = parseLineItemQuantity(item);
    const productName = getLineItemProductName(item);
    if (isOtoOrNonWorkshopLineItem(productName)) continue;
    workshopQty += qty;
  }

  return workshopQty > 0 ? workshopQty : 1;
}
