import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  generatePassToken,
  getPassPublicUrl,
  hashPassToken,
} from "@/lib/pass-tokens";
import { sendPassEmail } from "@/lib/email";
import { incrementSoldCount, getActiveWorkshopDate } from "@/lib/capacity";
import type { ClickFunnelsPurchase } from "@/lib/clickfunnels";
import type { WorkshopSlug } from "@/lib/workshop-keys";
import { RegistrationStatus } from "@prisma/client";

export type ProcessPurchaseResult =
  | { ok: true; registrationId: string; passToken: string; duplicate: boolean }
  | { ok: false; error: string; code: string };

function formatEventDate(d: Date): string {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(d);
}

async function resolveWorkshopDateId(
  purchase: ClickFunnelsPurchase
): Promise<string | null> {
  if (purchase.workshopDateId) {
    const found = await prisma.workshopDate.findUnique({
      where: { id: purchase.workshopDateId },
    });
    if (found) return found.id;
  }

  const active = await getActiveWorkshopDate(purchase.workshopSlug);
  return active?.id ?? null;
}

export async function processClickFunnelsPurchase(
  purchase: ClickFunnelsPurchase
): Promise<ProcessPurchaseResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "DATABASE_URL not configured", code: "NO_DB" };
  }

  const existingReg = await prisma.registration.findUnique({
    where: { externalOrderId: purchase.externalOrderId },
    include: { pass: true, attendee: true },
  });

  if (existingReg?.pass) {
    return {
      ok: true,
      registrationId: existingReg.id,
      passToken: "",
      duplicate: true,
    };
  }

  const workshopDateId = await resolveWorkshopDateId(purchase);
  if (!workshopDateId) {
    return {
      ok: false,
      error: "No active workshop date for this workshop",
      code: "NO_DATE",
    };
  }

  const workshopDate = await prisma.workshopDate.findUnique({
    where: { id: workshopDateId },
    include: { workshop: true },
  });

  if (!workshopDate) {
    return { ok: false, error: "Workshop date not found", code: "NO_DATE" };
  }

  const available = workshopDate.capacity - workshopDate.soldCount;
  if (available <= 0) {
    return { ok: false, error: "Workshop is sold out", code: "SOLD_OUT" };
  }

  const passToken = generatePassToken();
  const tokenHash = hashPassToken(passToken);
  const passUrl = getPassPublicUrl(passToken);

  const attendee = await prisma.attendee.upsert({
    where: { email: purchase.email },
    create: {
      email: purchase.email,
      name: purchase.name,
      phone: purchase.phone,
      metadata: purchase.raw as object,
    },
    update: {
      name: purchase.name ?? undefined,
      phone: purchase.phone ?? undefined,
      metadata: purchase.raw as object,
    },
  });

  const registration = await prisma.registration.create({
    data: {
      attendeeId: attendee.id,
      workshopDateId,
      externalOrderId: purchase.externalOrderId,
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

  const emailResult = await sendPassEmail({
    to: attendee.email,
    attendeeName: attendee.name ?? attendee.email,
    workshopLabel: registration.workshopDate.workshop.label,
    eventDate: formatEventDate(registration.workshopDate.startsAt),
    venue: registration.workshopDate.venue,
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

  return {
    ok: true,
    registrationId: registration.id,
    passToken,
    duplicate: false,
  };
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
    to: registration.attendee.email,
    attendeeName: registration.attendee.name ?? registration.attendee.email,
    workshopLabel: registration.workshopDate.workshop.label,
    eventDate: formatEventDate(registration.workshopDate.startsAt),
    venue: registration.workshopDate.venue,
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
