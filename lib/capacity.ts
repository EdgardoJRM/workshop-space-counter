import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { setSpaces } from "@/lib/redis";
import {
  DEFAULT_WORKSHOP,
  isWorkshopSlug,
  type WorkshopSlug,
} from "@/lib/workshop-keys";

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
 * Active date = isActive true, future or nearest; prefers soonest upcoming.
 */
export async function getActiveWorkshopDate(slug: WorkshopSlug) {
  if (!isDatabaseConfigured()) return null;

  const workshop = await prisma.workshop.findUnique({
    where: { slug },
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
  slug: WorkshopSlug
): Promise<CapacitySnapshot | null> {
  if (!isDatabaseConfigured() || !isWorkshopSlug(slug)) return null;

  const date = await getActiveWorkshopDate(slug);
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
export async function syncCapacityToRedis(slug: WorkshopSlug): Promise<void> {
  const snap = await getCapacitySnapshot(slug);
  if (!snap) return;
  await setSpaces(snap.available, snap.updatedAt ?? new Date().toISOString(), slug);
}

export async function applyManualAvailable(
  slug: WorkshopSlug,
  available: number
): Promise<CapacitySnapshot | null> {
  if (!isDatabaseConfigured()) return null;

  const date = await getActiveWorkshopDate(slug);
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

export { DEFAULT_WORKSHOP };
