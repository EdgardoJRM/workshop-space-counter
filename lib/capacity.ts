import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { getDefaultOrganization } from "@/lib/organization";
import { setSpaces } from "@/lib/redis";
import {
  DEFAULT_WORKSHOP,
  isWorkshopSlug,
  type WorkshopSlug,
} from "@/lib/workshop-keys";
import { GuestInfoRequestStatus, RegistrationStatus } from "@prisma/client";

export type CapacitySnapshot = {
  available: number;
  updatedAt: string | null;
  workshopDateId: string | null;
  capacity: number | null;
  soldCount: number | null;
};

export function computeAvailable(capacity: number, soldCount: number): number {
  return Math.max(0, capacity - soldCount);
}

/**
 * Fecha marcada como en venta para webhooks/ClickFunnels (una por taller).
 */
export async function getSellingWorkshopDate(
  slug: WorkshopSlug,
  organizationId?: string
) {
  if (!isDatabaseConfigured()) return null;

  const orgId =
    organizationId ?? (await getDefaultOrganization())?.id ?? null;
  if (!orgId) return null;

  const workshop = await prisma.workshop.findUnique({
    where: { organizationId_slug: { organizationId: orgId, slug } },
    include: {
      dates: {
        where: { isSelling: true },
        orderBy: { startsAt: "asc" },
        take: 1,
      },
    },
  });

  return workshop?.dates[0] ?? null;
}

/** Prioridad: fecha explícita > fecha en venta. */
export function pickWorkshopDateId(
  explicitDateId: string | null | undefined,
  sellingDateId: string | null | undefined
): string | null {
  if (explicitDateId) return explicitDateId;
  return sellingDateId ?? null;
}

/**
 * Active date = isActive true, future or nearest; prefers soonest upcoming.
 * Usado para UI/admin; no para routing de ventas.
 */
export async function getActiveWorkshopDate(
  slug: WorkshopSlug,
  organizationId?: string
) {
  if (!isDatabaseConfigured()) return null;

  const orgId =
    organizationId ?? (await getDefaultOrganization())?.id ?? null;
  if (!orgId) return null;

  const workshop = await prisma.workshop.findUnique({
    where: { organizationId_slug: { organizationId: orgId, slug } },
    include: {
      dates: {
        where: { isActive: true },
        orderBy: { startsAt: "asc" },
      },
    },
  });

  if (!workshop?.dates.length) return null;

  const now = Date.now();
  const upcoming = workshop.dates.find((d) => d.startsAt.getTime() >= now);
  return upcoming ?? workshop.dates[workshop.dates.length - 1];
}

export async function getCapacitySnapshot(
  slug: WorkshopSlug,
  organizationId?: string
): Promise<CapacitySnapshot | null> {
  if (!isDatabaseConfigured() || !isWorkshopSlug(slug)) return null;

  const date =
    (await getSellingWorkshopDate(slug, organizationId)) ??
    (await getActiveWorkshopDate(slug, organizationId));
  if (!date) return null;

  const available = computeAvailable(date.capacity, date.soldCount);
  return {
    available,
    updatedAt: date.updatedAt.toISOString(),
    workshopDateId: date.id,
    capacity: date.capacity,
    soldCount: date.soldCount,
  };
}

/** Sync computed available to Redis for legacy ClickFunnels widgets. */
export async function syncCapacityToRedis(
  slug: WorkshopSlug,
  organizationId?: string
): Promise<void> {
  const snap = await getCapacitySnapshot(slug, organizationId);
  if (!snap) return;
  await setSpaces(snap.available, snap.updatedAt ?? new Date().toISOString(), slug);
}

export async function applyManualAvailable(
  slug: WorkshopSlug,
  available: number,
  organizationId?: string
): Promise<CapacitySnapshot | null> {
  if (!isDatabaseConfigured()) return null;

  const date =
    (await getSellingWorkshopDate(slug, organizationId)) ??
    (await getActiveWorkshopDate(slug, organizationId));
  if (!date) return null;

  const soldCount = Math.max(0, date.capacity - available);
  const updated = await prisma.workshopDate.update({
    where: { id: date.id },
    data: { soldCount },
  });

  const snap: CapacitySnapshot = {
    available: computeAvailable(updated.capacity, updated.soldCount),
    updatedAt: updated.updatedAt.toISOString(),
    workshopDateId: updated.id,
    capacity: updated.capacity,
    soldCount: updated.soldCount,
  };

  await setSpaces(snap.available, snap.updatedAt ?? new Date().toISOString(), slug);
  return snap;
}

export async function incrementSoldCount(
  workshopDateId: string
): Promise<CapacitySnapshot | null> {
  const date = await prisma.workshopDate.update({
    where: { id: workshopDateId },
    data: { soldCount: { increment: 1 } },
    include: { workshop: true },
  });

  const slug = date.workshop.slug;
  if (!isWorkshopSlug(slug)) return null;

  const snap: CapacitySnapshot = {
    available: computeAvailable(date.capacity, date.soldCount),
    updatedAt: date.updatedAt.toISOString(),
    workshopDateId: date.id,
    capacity: date.capacity,
    soldCount: date.soldCount,
  };

  await setSpaces(
    snap.available,
    snap.updatedAt ?? new Date().toISOString(),
    slug as WorkshopSlug
  );
  return snap;
}

/** Ajusta soldCount a registros confirmados + cupos de invitados pendientes. */
export async function reconcileWorkshopDateSoldCount(workshopDateId: string): Promise<{
  previous: number;
  corrected: number;
}> {
  const existing = await prisma.workshopDate.findUnique({
    where: { id: workshopDateId },
    include: { workshop: true },
  });
  if (!existing) {
    return { previous: 0, corrected: 0 };
  }

  const confirmed = await prisma.registration.count({
    where: {
      workshopDateId,
      status: RegistrationStatus.CONFIRMED,
    },
  });

  const pendingRequests = await prisma.guestInfoRequest.findMany({
    where: {
      workshopDateId,
      status: GuestInfoRequestStatus.PENDING,
    },
    select: { slotsNeeded: true, slotsCompleted: true },
  });

  const reservedGuestSlots = pendingRequests.reduce(
    (sum, row) => sum + Math.max(0, row.slotsNeeded - row.slotsCompleted),
    0
  );

  const corrected = confirmed + reservedGuestSlots;

  const updated = await prisma.workshopDate.update({
    where: { id: workshopDateId },
    data: { soldCount: corrected },
    include: { workshop: true },
  });

  const slug = updated.workshop.slug;
  if (isWorkshopSlug(slug)) {
    await syncCapacityToRedis(slug, updated.workshop.organizationId);
  }

  return { previous: existing.soldCount, corrected };
}

export { DEFAULT_WORKSHOP };
