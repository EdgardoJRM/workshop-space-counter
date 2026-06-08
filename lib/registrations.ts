import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  generatePassToken,
  getPassPublicUrl,
  hashPassToken,
} from "@/lib/pass-tokens";
import { sendPassEmail } from "@/lib/email";
import {
  incrementSoldCount,
  getSellingWorkshopDate,
} from "@/lib/capacity";
import type { ClickFunnelsPurchase } from "@/lib/clickfunnels";
import { sanitizeJsonForPrisma } from "@/lib/webhook-events";
import type { WorkshopSlug } from "@/lib/workshop-keys";
import { isWorkshopSlug } from "@/lib/workshop-keys";
import { Prisma, RegistrationStatus, type Attendee } from "@prisma/client";
import { formatWorkshopDateTime } from "@/lib/workshop-datetime";

function isUniqueConstraintError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

/** Avoids upsert on compound unique when production DB lacks SaaS indexes yet. */
async function findOrCreateAttendee(input: {
  organizationId: string;
  email: string;
  name: string | null;
  phone: string | null;
  metadata?: object;
}): Promise<Attendee> {
  const email = input.email.trim().toLowerCase();

  let attendee = await prisma.attendee.findFirst({
    where: { organizationId: input.organizationId, email },
  });

  if (!attendee) {
    const legacy = await prisma.attendee.findFirst({
      where: { email },
    });
    if (legacy) {
      attendee = await prisma.attendee.update({
        where: { id: legacy.id },
        data: {
          organizationId: input.organizationId,
          name: input.name ?? legacy.name,
          phone: input.phone ?? legacy.phone,
          ...(input.metadata ? { metadata: input.metadata } : {}),
        },
      });
    }
  }

  if (attendee) {
    return prisma.attendee.update({
      where: { id: attendee.id },
      data: {
        name: input.name ?? undefined,
        phone: input.phone ?? undefined,
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
    });
  }

  try {
    return await prisma.attendee.create({
      data: {
        organizationId: input.organizationId,
        email,
        name: input.name,
        phone: input.phone,
        metadata: input.metadata,
      },
    });
  } catch (err) {
    if (!isUniqueConstraintError(err)) throw err;
    const existing = await prisma.attendee.findFirst({
      where: { email },
    });
    if (!existing) throw err;
    return prisma.attendee.update({
      where: { id: existing.id },
      data: {
        organizationId: input.organizationId,
        name: input.name ?? undefined,
        phone: input.phone ?? undefined,
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
    });
  }
}

export type ProcessPurchaseResult =
  | { ok: true; registrationId: string; passToken: string; duplicate: boolean }
  | { ok: false; error: string; code: string };

export type RegisterAttendeeInput = {
  email: string;
  name: string | null;
  phone: string | null;
  workshopSlug: WorkshopSlug;
  workshopDateId?: string | null;
  externalOrderId: string;
  source: string;
  metadata?: object;
  sendPassEmail?: boolean;
};

function formatEventDate(d: Date): string {
  return formatWorkshopDateTime(d);
}

async function resolveWorkshopDateIdForSlug(
  workshopSlug: WorkshopSlug,
  workshopDateId?: string | null,
  organizationId?: string | null
): Promise<string | null> {
  if (workshopDateId) {
    const found = await prisma.workshopDate.findFirst({
      where: {
        id: workshopDateId,
        workshop: {
          slug: workshopSlug,
          ...(organizationId ? { organizationId } : {}),
        },
      },
    });
    if (found) return found.id;
  }

  const orgId =
    organizationId ??
    (
      await prisma.workshop.findFirst({
        where: { slug: workshopSlug },
        select: { organizationId: true },
      })
    )?.organizationId;

  const selling = await getSellingWorkshopDate(
    workshopSlug,
    orgId ?? undefined
  );
  return selling?.id ?? null;
}

export async function registerAttendee(
  input: RegisterAttendeeInput
): Promise<ProcessPurchaseResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "DATABASE_URL not configured", code: "NO_DB" };
  }

  const existingReg = await prisma.registration.findUnique({
    where: { externalOrderId: input.externalOrderId },
    include: { pass: true },
  });

  if (existingReg?.pass) {
    return {
      ok: true,
      registrationId: existingReg.id,
      passToken: "",
      duplicate: true,
    };
  }

  const workshopDateId = await resolveWorkshopDateIdForSlug(
    input.workshopSlug,
    input.workshopDateId
  );
  if (!workshopDateId) {
    return {
      ok: false,
      error: "No hay fecha en venta para este taller",
      code: "NO_DATE",
    };
  }

  const workshopDate = await prisma.workshopDate.findUnique({
    where: { id: workshopDateId },
    include: { workshop: true },
  });

  if (!workshopDate) {
    return { ok: false, error: "Fecha de taller no encontrada", code: "NO_DATE" };
  }

  const existingForDate = await prisma.registration.findFirst({
    where: {
      workshopDateId,
      OR: [
        { attendeeEmail: input.email },
        { attendee: { email: input.email } },
      ],
      status: RegistrationStatus.CONFIRMED,
    },
    include: { pass: true },
  });

  if (existingForDate?.pass) {
    return {
      ok: true,
      registrationId: existingForDate.id,
      passToken: "",
      duplicate: true,
    };
  }

  const available = workshopDate.capacity - workshopDate.soldCount;
  if (available <= 0) {
    return { ok: false, error: "No hay cupos disponibles", code: "SOLD_OUT" };
  }

  const passToken = generatePassToken();
  const tokenHash = hashPassToken(passToken);
  const passUrl = getPassPublicUrl(passToken);
  const sendEmail = input.sendPassEmail !== false;

  const organizationId = workshopDate.workshop.organizationId;
  const metadata = input.metadata
    ? sanitizeJsonForPrisma(input.metadata)
    : undefined;

  const attendee = await findOrCreateAttendee({
    organizationId,
    email: input.email,
    name: input.name,
    phone: input.phone,
    metadata,
  });

  const registration = await prisma.registration.create({
    data: {
      attendeeId: attendee.id,
      workshopDateId,
      externalOrderId: input.externalOrderId,
      attendeeName: input.name,
      attendeeEmail: input.email,
      attendeePhone: input.phone,
      source: input.source,
      metadata,
      status: RegistrationStatus.CONFIRMED,
      pass: {
        create: {
          tokenHash,
        },
      },
    },
    include: {
      pass: true,
      workshopDate: { include: { workshop: true } },
      attendee: true,
    },
  });

  await incrementSoldCount(workshopDateId);

  if (sendEmail) {
    const emailResult = await sendPassEmail({
      to: registration.attendeeEmail ?? attendee.email,
      attendeeName:
        registration.attendeeName ??
        attendee.name ??
        registration.attendeeEmail ??
        attendee.email,
      workshopLabel: registration.workshopDate.workshop.label,
      eventDate: formatEventDate(registration.workshopDate.startsAt),
      venue: registration.workshopDate.venue,
      mapsUrl: registration.workshopDate.mapsUrl,
      passUrl,
      checkinToken: passToken,
    });

    await prisma.pass.update({
      where: { id: registration.pass!.id },
      data: {
        emailedAt: emailResult.ok ? new Date() : undefined,
        emailError: emailResult.ok ? null : emailResult.error,
      },
    });
  }

  return {
    ok: true,
    registrationId: registration.id,
    passToken,
    duplicate: false,
  };
}

export async function processClickFunnelsPurchase(
  purchase: ClickFunnelsPurchase
): Promise<ProcessPurchaseResult> {
  if (!purchase.workshopSlug || !isWorkshopSlug(purchase.workshopSlug)) {
    return { ok: false, error: "Invalid workshop", code: "INVALID_WORKSHOP" };
  }

  if (purchase.ticketQuantity > 1) {
    const { ensureCapacityForTickets } = await import("@/lib/guest-info");
    const capacity = await ensureCapacityForTickets(
      purchase.workshopSlug,
      purchase.workshopDateId,
      purchase.ticketQuantity
    );
    if (!capacity.ok) {
      return { ok: false, error: capacity.error, code: capacity.code };
    }
  }

  return registerAttendee({
    email: purchase.email,
    name: purchase.name,
    phone: purchase.phone,
    workshopSlug: purchase.workshopSlug,
    workshopDateId: purchase.workshopDateId,
    externalOrderId: purchase.externalOrderId,
    source: "clickfunnels",
    metadata: sanitizeJsonForPrisma(purchase.raw),
    sendPassEmail: true,
  });
}

export type CsvImportRowResult = {
  row: number;
  email: string;
  ok: boolean;
  duplicate?: boolean;
  registrationId?: string;
  error?: string;
  code?: string;
};

export async function importRegistrationsFromCsv(
  rows: { row: number; email: string; name: string | null; phone: string | null }[],
  workshopSlug: WorkshopSlug,
  options?: { sendPassEmail?: boolean; importBatchId?: string }
): Promise<{
  created: number;
  duplicates: number;
  failed: number;
  results: CsvImportRowResult[];
}> {
  const batchId = options?.importBatchId ?? `batch-${Date.now()}`;
  const results: CsvImportRowResult[] = [];
  let created = 0;
  let duplicates = 0;
  let failed = 0;

  const workshopDateId = await resolveWorkshopDateIdForSlug(workshopSlug, null);

  for (const r of rows) {
    const externalOrderId = workshopDateId
      ? `csv:${workshopDateId}:${r.email}`
      : `csv:${workshopSlug}:${r.email}`;

    const outcome = await registerAttendee({
      email: r.email,
      name: r.name,
      phone: r.phone,
      workshopSlug,
      externalOrderId,
      source: "csv",
      metadata: { source: "csv-import", batchId, csvRow: r.row },
      sendPassEmail: options?.sendPassEmail !== false,
    });

    if (!outcome.ok) {
      failed += 1;
      results.push({
        row: r.row,
        email: r.email,
        ok: false,
        error: outcome.error,
        code: outcome.code,
      });
      continue;
    }

    if (outcome.duplicate) {
      duplicates += 1;
      results.push({
        row: r.row,
        email: r.email,
        ok: true,
        duplicate: true,
        registrationId: outcome.registrationId,
      });
    } else {
      created += 1;
      results.push({
        row: r.row,
        email: r.email,
        ok: true,
        duplicate: false,
        registrationId: outcome.registrationId,
      });
    }
  }

  return { created, duplicates, failed, results };
}

export async function resendPassEmail(registrationId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      pass: true,
      attendee: true,
      workshopDate: { include: { workshop: true } },
    },
  });

  if (!registration?.pass || !registration.attendee) {
    return { ok: false, error: "Registration or pass not found" };
  }

  const passToken = generatePassToken();
  const tokenHash = hashPassToken(passToken);
  const passUrl = getPassPublicUrl(passToken);

  await prisma.pass.update({
    where: { id: registration.pass.id },
    data: { tokenHash, revoked: false },
  });

  const emailResult = await sendPassEmail({
    to: registration.attendeeEmail ?? registration.attendee.email,
    attendeeName:
      registration.attendeeName ??
      registration.attendee.name ??
      registration.attendeeEmail ??
      registration.attendee.email,
    workshopLabel: registration.workshopDate.workshop.label,
    eventDate: formatEventDate(registration.workshopDate.startsAt),
    venue: registration.workshopDate.venue,
    mapsUrl: registration.workshopDate.mapsUrl,
    passUrl,
    checkinToken: passToken,
  });

  await prisma.pass.update({
    where: { id: registration.pass.id },
    data: {
      emailedAt: emailResult.ok ? new Date() : undefined,
      emailError: emailResult.ok ? null : emailResult.error,
    },
  });

  if (!emailResult.ok) {
    return { ok: false, error: emailResult.error };
  }
  return { ok: true };
}

export async function getRegistrationByPassToken(token: string) {
  const tokenHash = hashPassToken(token);
  return prisma.pass.findUnique({
    where: { tokenHash },
    include: {
      registration: {
        include: {
          attendee: true,
          workshopDate: { include: { workshop: true } },
          checkins: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });
}

export async function resolveWorkshopSlugFromDate(
  workshopDateId: string
): Promise<WorkshopSlug | null> {
  const d = await prisma.workshopDate.findUnique({
    where: { id: workshopDateId },
    include: { workshop: true },
  });
  if (!d) return null;
  return d.workshop.slug as WorkshopSlug;
}
