import { RegistrationStatus } from "@prisma/client";
import { decrementSoldCount } from "@/lib/capacity";
import { prisma } from "@/lib/prisma";
import { normalizeRegistrationEmail } from "@/lib/registrations";

export type DuplicateRegistrationCandidate = {
  id: string;
  workshopDateId: string;
  email: string;
  attendeeName: string | null;
  registeredAt: Date;
  source: string | null;
  externalOrderId: string | null;
  checkinCount: number;
  hasGuestInfoRequest: boolean;
};

export type DuplicateRegistrationGroup = {
  workshopDateId: string;
  email: string;
  keep: DuplicateRegistrationCandidate;
  remove: DuplicateRegistrationCandidate[];
};

export type RemoveDuplicateRegistrationsResult = {
  dryRun: boolean;
  groups: DuplicateRegistrationGroup[];
  removedIds: string[];
  keptIds: string[];
  soldCountAdjusted: Record<string, number>;
};

function registrationEmail(
  attendeeEmail: string | null | undefined,
  attendee: { email: string }
): string {
  return normalizeRegistrationEmail(attendeeEmail ?? attendee.email);
}

/** Prefer check-in, then guest-info buyer row, then oldest registration. */
export function pickRegistrationToKeep(
  rows: DuplicateRegistrationCandidate[]
): DuplicateRegistrationCandidate {
  return [...rows].sort((a, b) => {
    const aChecked = a.checkinCount > 0 ? 0 : 1;
    const bChecked = b.checkinCount > 0 ? 0 : 1;
    if (aChecked !== bChecked) return aChecked - bChecked;

    const aGuest = a.hasGuestInfoRequest ? 0 : 1;
    const bGuest = b.hasGuestInfoRequest ? 0 : 1;
    if (aGuest !== bGuest) return aGuest - bGuest;

    return a.registeredAt.getTime() - b.registeredAt.getTime();
  })[0];
}

export async function findDuplicateRegistrationGroups(
  organizationId: string
): Promise<DuplicateRegistrationGroup[]> {
  const registrations = await prisma.registration.findMany({
    where: {
      status: RegistrationStatus.CONFIRMED,
      workshopDate: {
        workshop: { organizationId },
      },
    },
    include: {
      attendee: true,
      checkins: { select: { id: true } },
      guestInfoRequestAsBuyer: { select: { id: true } },
      workshopDate: {
        select: {
          workshop: { select: { label: true, slug: true } },
        },
      },
    },
    orderBy: { registeredAt: "asc" },
  });

  const byKey = new Map<string, DuplicateRegistrationCandidate[]>();

  for (const reg of registrations) {
    const email = registrationEmail(reg.attendeeEmail, reg.attendee);
    const key = `${reg.workshopDateId}:${email}`;
    const row: DuplicateRegistrationCandidate = {
      id: reg.id,
      workshopDateId: reg.workshopDateId,
      email,
      attendeeName: reg.attendeeName ?? reg.attendee.name,
      registeredAt: reg.registeredAt,
      source: reg.source,
      externalOrderId: reg.externalOrderId,
      checkinCount: reg.checkins.length,
      hasGuestInfoRequest: Boolean(reg.guestInfoRequestAsBuyer),
    };

    const bucket = byKey.get(key) ?? [];
    bucket.push(row);
    byKey.set(key, bucket);
  }

  const groups: DuplicateRegistrationGroup[] = [];
  for (const rows of byKey.values()) {
    if (rows.length < 2) continue;
    const keep = pickRegistrationToKeep(rows);
    const remove = rows.filter((row) => row.id !== keep.id);
    groups.push({
      workshopDateId: keep.workshopDateId,
      email: keep.email,
      keep,
      remove,
    });
  }

  groups.sort((a, b) => a.keep.registeredAt.getTime() - b.keep.registeredAt.getTime());
  return groups;
}

export async function removeDuplicateRegistrations(input: {
  organizationId: string;
  dryRun?: boolean;
  maxRemovals?: number;
}): Promise<RemoveDuplicateRegistrationsResult> {
  const groups = await findDuplicateRegistrationGroups(input.organizationId);
  const toRemove = groups.flatMap((group) => group.remove);
  const capped =
    typeof input.maxRemovals === "number" && input.maxRemovals > 0
      ? toRemove.slice(0, input.maxRemovals)
      : toRemove;
  const removeIds = capped.map((row) => row.id);
  const keptIds = [
    ...new Set(
      groups
        .filter((group) => group.remove.some((row) => removeIds.includes(row.id)))
        .map((group) => group.keep.id)
    ),
  ];

  const soldCountAdjusted: Record<string, number> = {};

  if (!input.dryRun && removeIds.length > 0) {
    const removed = await prisma.registration.findMany({
      where: { id: { in: removeIds } },
      select: { id: true, workshopDateId: true },
    });

    await prisma.registration.deleteMany({
      where: { id: { in: removeIds } },
    });

    const counts = new Map<string, number>();
    for (const row of removed) {
      counts.set(row.workshopDateId, (counts.get(row.workshopDateId) ?? 0) + 1);
    }

    for (const [workshopDateId, count] of counts) {
      for (let i = 0; i < count; i += 1) {
        await decrementSoldCount(workshopDateId);
      }
      soldCountAdjusted[workshopDateId] = count;
    }
  }

  return {
    dryRun: Boolean(input.dryRun),
    groups: groups.filter((group) =>
      group.remove.some((row) => removeIds.includes(row.id))
    ),
    removedIds: removeIds,
    keptIds,
    soldCountAdjusted,
  };
}
