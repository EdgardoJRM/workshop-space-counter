import { GuestInfoRequestStatus } from "@prisma/client";
import type { ClickFunnelsPurchase } from "@/lib/clickfunnels";
import { guestExternalOrderId } from "@/lib/clickfunnels";
import { sendGuestInfoRequestEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import {
  generatePassToken,
  getPassPublicUrl,
  hashPassToken,
} from "@/lib/pass-tokens";
import {
  registerAttendee,
  type ProcessPurchaseResult,
} from "@/lib/registrations";
import type { WorkshopSlug } from "@/lib/workshop-keys";
import { isWorkshopSlug } from "@/lib/workshop-keys";
const GUEST_REQUEST_TTL_DAYS = 14;

export function getGuestInfoPublicUrl(token: string): string {
  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
  if (!base) return `/guests/${token}`;
  return `${base}/guests/${token}`;
}

export type GuestInfoRequestView = {
  id: string;
  status: GuestInfoRequestStatus;
  slotsNeeded: number;
  slotsCompleted: number;
  workshopLabel: string;
  workshopSlug: WorkshopSlug;
  eventDate: string;
  venue: string | null;
  buyerName: string;
  buyerEmail: string;
  expiresAt: string;
  expired: boolean;
};

export type GuestSubmitInput = {
  name: string;
  email: string;
  phone?: string | null;
};

async function loadRequestByTokenHash(tokenHash: string) {
  return prisma.guestInfoRequest.findUnique({
    where: { tokenHash },
    include: {
      buyerRegistration: {
        include: {
          workshopDate: { include: { workshop: true } },
          attendee: true,
        },
      },
    },
  });
}

export async function getGuestInfoRequestByToken(
  token: string
): Promise<GuestInfoRequestView | null> {
  const tokenHash = hashPassToken(token);
  const row = await loadRequestByTokenHash(tokenHash);
  if (!row || !isWorkshopSlug(row.workshopSlug)) return null;

  const reg = row.buyerRegistration;
  const buyerName =
    reg.attendeeName ?? reg.attendee.name ?? reg.attendeeEmail ?? reg.attendee.email;
  const buyerEmail = reg.attendeeEmail ?? reg.attendee.email;

  const expired =
    row.status === GuestInfoRequestStatus.EXPIRED ||
    row.expiresAt.getTime() < Date.now();

  const { formatWorkshopDateTime } = await import("@/lib/workshop-datetime");

  return {
    id: row.id,
    status: expired ? GuestInfoRequestStatus.EXPIRED : row.status,
    slotsNeeded: row.slotsNeeded,
    slotsCompleted: row.slotsCompleted,
    workshopLabel: reg.workshopDate.workshop.label,
    workshopSlug: row.workshopSlug,
    eventDate: formatWorkshopDateTime(reg.workshopDate.startsAt),
    venue: reg.workshopDate.venue,
    buyerName,
    buyerEmail,
    expiresAt: row.expiresAt.toISOString(),
    expired,
  };
}

export async function createGuestInfoRequest(input: {
  organizationId: string;
  buyerRegistrationId: string;
  purchase: ClickFunnelsPurchase;
  workshopSlug: WorkshopSlug;
  workshopDateId: string;
  buyerPassUrl: string;
}): Promise<
  | { ok: true; token: string; guestInfoUrl: string; slotsNeeded: number }
  | { ok: false; error: string }
> {
  const slotsNeeded = Math.max(0, input.purchase.ticketQuantity - 1);
  if (slotsNeeded === 0) {
    return { ok: false, error: "No guest slots needed" };
  }

  const existing = await prisma.guestInfoRequest.findUnique({
    where: {
      organizationId_externalOrderId: {
        organizationId: input.organizationId,
        externalOrderId: input.purchase.externalOrderId,
      },
    },
  });

  if (existing) {
    return { ok: false, error: "Guest request already exists" };
  }

  const token = generatePassToken();
  const tokenHash = hashPassToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + GUEST_REQUEST_TTL_DAYS);

  await prisma.guestInfoRequest.create({
    data: {
      organizationId: input.organizationId,
      buyerRegistrationId: input.buyerRegistrationId,
      externalOrderId: input.purchase.externalOrderId,
      tokenHash,
      slotsNeeded,
      workshopSlug: input.workshopSlug,
      workshopDateId: input.workshopDateId,
      expiresAt,
    },
  });

  const guestInfoUrl = getGuestInfoPublicUrl(token);
  const buyerReg = await prisma.registration.findUnique({
    where: { id: input.buyerRegistrationId },
    include: { workshopDate: { include: { workshop: true } } },
  });

  if (buyerReg) {
    const { formatWorkshopDateTime } = await import("@/lib/workshop-datetime");
    await sendGuestInfoRequestEmail({
      to: input.purchase.email,
      buyerName: input.purchase.name ?? input.purchase.email,
      workshopLabel: buyerReg.workshopDate.workshop.label,
      eventDate: formatWorkshopDateTime(buyerReg.workshopDate.startsAt),
      ticketQuantity: input.purchase.ticketQuantity,
      slotsNeeded,
      guestInfoUrl,
      buyerPassUrl: input.buyerPassUrl,
    });
  }

  return { ok: true, token, guestInfoUrl, slotsNeeded };
}

export async function maybeCreateGuestInfoAfterPurchase(input: {
  organizationId: string;
  purchase: ClickFunnelsPurchase;
  registrationId: string;
  passToken: string;
}): Promise<string | undefined> {
  if (input.purchase.ticketQuantity <= 1 || !input.purchase.workshopSlug) {
    return undefined;
  }

  const registration = await prisma.registration.findUnique({
    where: { id: input.registrationId },
    select: { workshopDateId: true },
  });
  if (!registration) return undefined;

  const buyerPassUrl = input.passToken
    ? buildBuyerPassUrl(input.passToken)
    : `${process.env.APP_BASE_URL?.replace(/\/$/, "") ?? ""}/pass`;

  const guestRequest = await createGuestInfoRequest({
    organizationId: input.organizationId,
    buyerRegistrationId: input.registrationId,
    purchase: input.purchase,
    workshopSlug: input.purchase.workshopSlug,
    workshopDateId: registration.workshopDateId,
    buyerPassUrl,
  });

  if (guestRequest.ok) {
    return guestRequest.guestInfoUrl;
  }
  if (guestRequest.error !== "Guest request already exists") {
    console.warn("[guest-info] post-purchase guest request failed", {
      externalOrderId: input.purchase.externalOrderId,
      error: guestRequest.error,
    });
  }
  return undefined;
}

export async function completeGuestInfoRequest(
  token: string,
  guests: GuestSubmitInput[]
): Promise<
  | { ok: true; created: number; duplicates: number }
  | { ok: false; error: string; code: string }
> {
  const tokenHash = hashPassToken(token);
  const row = await loadRequestByTokenHash(tokenHash);

  if (!row) {
    return { ok: false, error: "Enlace no válido", code: "NOT_FOUND" };
  }

  if (
    row.status === GuestInfoRequestStatus.COMPLETED ||
    row.status === GuestInfoRequestStatus.EXPIRED ||
    row.expiresAt.getTime() < Date.now()
  ) {
    return { ok: false, error: "Este enlace ya no está disponible", code: "EXPIRED" };
  }

  if (!isWorkshopSlug(row.workshopSlug)) {
    return { ok: false, error: "Taller inválido", code: "INVALID_WORKSHOP" };
  }

  if (guests.length !== row.slotsNeeded) {
    return {
      ok: false,
      error: `Debes completar ${row.slotsNeeded} persona(s)`,
      code: "INCOMPLETE",
    };
  }

  const buyerEmail = (
    row.buyerRegistration.attendeeEmail ?? row.buyerRegistration.attendee.email
  ).toLowerCase();

  const normalized = guests.map((g) => ({
    name: g.name.trim(),
    email: g.email.trim().toLowerCase(),
    phone: g.phone?.trim() || null,
  }));

  for (const g of normalized) {
    if (!g.name || !g.email) {
      return { ok: false, error: "Nombre y email son requeridos", code: "INVALID" };
    }
    if (g.email === buyerEmail) {
      return {
        ok: false,
        error: "El invitado no puede usar el mismo email del comprador",
        code: "BUYER_EMAIL",
      };
    }
  }

  const emails = new Set<string>();
  for (const g of normalized) {
    if (emails.has(g.email)) {
      return { ok: false, error: "Emails de invitados duplicados", code: "DUPLICATE_EMAIL" };
    }
    emails.add(g.email);
  }

  const metadata = row.buyerRegistration.metadata ?? undefined;
  let created = 0;
  let duplicates = 0;
  const createdRegistrationIds: string[] = [];

  try {
    for (let i = 0; i < normalized.length; i++) {
      const guest = normalized[i]!;
      const externalOrderId = guestExternalOrderId(row.externalOrderId, i + 1);

      const result: ProcessPurchaseResult = await registerAttendee({
        email: guest.email,
        name: guest.name,
        phone: guest.phone,
        workshopSlug: row.workshopSlug,
        workshopDateId: row.workshopDateId,
        externalOrderId,
        source: "clickfunnels-guest",
        metadata: metadata ? (metadata as object) : undefined,
        sendPassEmail: true,
        skipSoldCountIncrement: true,
      });

      if (!result.ok) {
        if (createdRegistrationIds.length > 0) {
          await prisma.registration.deleteMany({
            where: { id: { in: createdRegistrationIds } },
          });
        }
        return { ok: false, error: result.error, code: result.code };
      }

      if (result.duplicate) duplicates += 1;
      else {
        created += 1;
        if (result.registrationId) createdRegistrationIds.push(result.registrationId);
      }
    }

    await prisma.guestInfoRequest.update({
      where: { id: row.id },
      data: {
        status: GuestInfoRequestStatus.COMPLETED,
        slotsCompleted: row.slotsNeeded,
      },
    });
  } catch (err) {
    if (createdRegistrationIds.length > 0) {
      await prisma.registration.deleteMany({
        where: { id: { in: createdRegistrationIds } },
      });
    }
    console.error("[guest-info] complete failed", err);
    return {
      ok: false,
      error: "No se pudieron guardar los invitados. Intenta de nuevo.",
      code: "SERVER_ERROR",
    };
  }

  return { ok: true, created, duplicates };
}

export async function ensureCapacityForTickets(
  workshopSlug: WorkshopSlug,
  workshopDateId: string | null | undefined,
  ticketQuantity: number,
  organizationId?: string
): Promise<{ ok: true } | { ok: false; error: string; code: string }> {
  const { getSellingWorkshopDate, computeAvailable } = await import("@/lib/capacity");
  const { prisma: db } = await import("@/lib/prisma");

  let dateId = workshopDateId ?? null;
  if (!dateId) {
    const selling = await getSellingWorkshopDate(workshopSlug, organizationId);
    dateId = selling?.id ?? null;
  }
  if (!dateId) {
    return { ok: false, error: "No hay fecha en venta para este taller", code: "NO_DATE" };
  }

  const date = await db.workshopDate.findUnique({ where: { id: dateId } });
  if (!date) {
    return { ok: false, error: "Fecha de taller no encontrada", code: "NO_DATE" };
  }

  const available = computeAvailable(date.capacity, date.soldCount);
  if (available < ticketQuantity) {
    return {
      ok: false,
      error: `Solo quedan ${available} cupo(s); la orden pide ${ticketQuantity}`,
      code: "SOLD_OUT",
    };
  }

  return { ok: true };
}

export function buildBuyerPassUrl(passToken: string): string {
  return getPassPublicUrl(passToken);
}

export type PendingGuestInfoSummary = {
  id: string;
  buyerName: string;
  buyerEmail: string;
  workshopLabel: string;
  slotsNeeded: number;
  slotsCompleted: number;
  expiresAt: string;
  createdAt: string;
};

export async function listPendingGuestInfoRequests(
  organizationId: string
): Promise<PendingGuestInfoSummary[]> {
  const rows = await prisma.guestInfoRequest.findMany({
    where: {
      organizationId,
      status: GuestInfoRequestStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
    include: {
      buyerRegistration: {
        include: {
          attendee: true,
          workshopDate: { include: { workshop: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return rows.map((row) => {
    const buyerName =
      row.buyerRegistration.attendeeName ??
      row.buyerRegistration.attendee.name ??
      row.buyerRegistration.attendeeEmail ??
      row.buyerRegistration.attendee.email;
    const buyerEmail =
      row.buyerRegistration.attendeeEmail ?? row.buyerRegistration.attendee.email;

    return {
      id: row.id,
      buyerName,
      buyerEmail,
      workshopLabel: row.buyerRegistration.workshopDate.workshop.label,
      slotsNeeded: row.slotsNeeded,
      slotsCompleted: row.slotsCompleted,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  });
}
