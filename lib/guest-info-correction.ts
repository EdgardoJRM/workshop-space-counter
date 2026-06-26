import { GuestInfoRequestStatus, RegistrationStatus } from "@prisma/client";
import { syncCapacityToRedis, reconcileWorkshopDateSoldCount } from "@/lib/capacity";
import { sendOtoMisreadApologyEmail } from "@/lib/email";
import { formatWorkshopDateTime } from "@/lib/workshop-datetime";
import {
  generatePassToken,
  getPassPublicUrl,
  hashPassToken,
} from "@/lib/pass-tokens";
import { isWorkshopSlug } from "@/lib/workshop-keys";
import { prisma } from "@/lib/prisma";

export type CorrectOtoGuestMisreadResult =
  | {
      ok: true;
      registrationId: string;
      releasedGuestSlots: number;
      soldCountReconciled?: { previous: number; corrected: number };
      emailSent: boolean;
      emailError?: string;
    }
  | { ok: false; error: string; code: string };

/** Cancela invitados pendientes por confundir un OTO con boleto extra y opcionalmente disculpa. */
export async function correctOtoGuestMisread(
  registrationId: string,
  organizationId: string,
  options?: { sendApologyEmail?: boolean }
): Promise<CorrectOtoGuestMisreadResult> {
  const registration = await prisma.registration.findFirst({
    where: {
      id: registrationId,
      workshopDate: { workshop: { organizationId } },
    },
    include: {
      pass: true,
      attendee: true,
      guestInfoRequestAsBuyer: true,
      workshopDate: { include: { workshop: true } },
    },
  });

  if (!registration) {
    return { ok: false, error: "Registration not found", code: "NOT_FOUND" };
  }

  const guestRequest = registration.guestInfoRequestAsBuyer;
  let releasedGuestSlots = 0;

  if (
    guestRequest &&
    guestRequest.status !== GuestInfoRequestStatus.COMPLETED
  ) {
    releasedGuestSlots = Math.max(
      0,
      guestRequest.slotsNeeded - guestRequest.slotsCompleted
    );

    await prisma.$transaction(async (tx) => {
      if (
        releasedGuestSlots > 0 &&
        registration.status === RegistrationStatus.CONFIRMED
      ) {
        await tx.workshopDate.update({
          where: { id: registration.workshopDateId },
          data: { soldCount: { decrement: releasedGuestSlots } },
        });
      }

      if (guestRequest.status !== GuestInfoRequestStatus.EXPIRED) {
        await tx.guestInfoRequest.update({
          where: { id: guestRequest.id },
          data: { status: GuestInfoRequestStatus.EXPIRED },
        });
      }
    });

    const date = await prisma.workshopDate.findUnique({
      where: { id: registration.workshopDateId },
      select: { soldCount: true },
    });
    if (date && date.soldCount < 0) {
      await prisma.workshopDate.update({
        where: { id: registration.workshopDateId },
        data: { soldCount: 0 },
      });
    }

    const slug = registration.workshopDate.workshop.slug;
    if (isWorkshopSlug(slug)) {
      await syncCapacityToRedis(slug, organizationId);
    }
  }

  const soldCountReconciled = await reconcileWorkshopDateSoldCount(
    registration.workshopDateId
  );

  let emailSent = false;
  let emailError: string | undefined;

  if (options?.sendApologyEmail !== false && registration.pass) {
    const passToken = generatePassToken();
    await prisma.pass.update({
      where: { id: registration.pass.id },
      data: { tokenHash: hashPassToken(passToken), revoked: false },
    });

    const to =
      registration.attendeeEmail?.trim() ||
      registration.attendee.email.trim();
    const name =
      registration.attendeeName?.trim() ||
      registration.attendee.name?.trim() ||
      to;

    const sent = await sendOtoMisreadApologyEmail({
      to,
      attendeeName: name,
      workshopLabel: registration.workshopDate.workshop.label,
      eventDate: formatWorkshopDateTime(registration.workshopDate.startsAt),
      passUrl: getPassPublicUrl(passToken),
    });

    emailSent = sent.ok;
    if (!sent.ok) emailError = sent.error;
  }

  return {
    ok: true,
    registrationId,
    releasedGuestSlots,
    soldCountReconciled,
    emailSent,
    emailError,
  };
}
