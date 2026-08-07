import { RegistrationStatus } from "@prisma/client";
import { syncCapacityToRedis } from "@/lib/capacity";
import { guestExternalOrderId } from "@/lib/clickfunnels";
import { isWorkshopSlug } from "@/lib/workshop-keys";
import { prisma } from "@/lib/prisma";

export type TransferRegistrationResult =
  | {
      ok: true;
      movedRegistrationIds: string[];
      fromWorkshopDateId: string;
      toWorkshopDateId: string;
      reservedGuestSlots: number;
    }
  | { ok: false; error: string; code: string };

/** Mueve el registro del comprador, invitados del mismo pedido y la solicitud de invitados. */
export async function transferRegistrationOrderToWorkshopDate(
  registrationId: string,
  targetWorkshopDateId: string,
  organizationId: string
): Promise<TransferRegistrationResult> {
  const buyer = await prisma.registration.findFirst({
    where: {
      id: registrationId,
      workshopDate: { workshop: { organizationId } },
    },
    include: {
      attendee: true,
      guestInfoRequestAsBuyer: true,
      workshopDate: { include: { workshop: true } },
    },
  });

  if (!buyer) {
    return { ok: false, error: "Registration not found", code: "NOT_FOUND" };
  }

  if (buyer.workshopDateId === targetWorkshopDateId) {
    return {
      ok: true,
      movedRegistrationIds: [buyer.id],
      fromWorkshopDateId: buyer.workshopDateId,
      toWorkshopDateId: targetWorkshopDateId,
      reservedGuestSlots: buyer.guestInfoRequestAsBuyer?.slotsNeeded ?? 0,
    };
  }

  const targetDate = await prisma.workshopDate.findFirst({
    where: {
      id: targetWorkshopDateId,
      workshop: {
        organizationId,
        slug: buyer.workshopDate.workshop.slug,
      },
    },
    include: { workshop: true },
  });

  if (!targetDate) {
    return {
      ok: false,
      error: "La fecha no pertenece a este taller",
      code: "INVALID_DATE",
    };
  }

  const buyerEmail = (
    buyer.attendeeEmail ??
    buyer.attendee?.email ??
    ""
  )
    .trim()
    .toLowerCase();
  if (buyerEmail) {
    const existingOnTarget = await prisma.registration.findFirst({
      where: {
        workshopDateId: targetWorkshopDateId,
        status: RegistrationStatus.CONFIRMED,
        id: { notIn: [buyer.id] },
        OR: [
          { attendeeEmail: buyerEmail },
          { attendee: { email: buyerEmail } },
        ],
      },
      select: { id: true },
    });
    if (existingOnTarget) {
      return {
        ok: false,
        error:
          "Ya hay un registro confirmado con ese email en la fecha destino",
        code: "DUPLICATE_EMAIL",
      };
    }
  }

  const baseOrderId = buyer.externalOrderId?.trim();
  const relatedIds = new Set<string>([buyer.id]);

  if (baseOrderId) {
    for (let i = 1; i <= 10; i++) {
      const guestOrderId = guestExternalOrderId(baseOrderId, i);
      const guestReg = await prisma.registration.findUnique({
        where: { externalOrderId: guestOrderId },
        select: { id: true, workshopDateId: true, status: true },
      });
      if (!guestReg) break;
      if (guestReg.workshopDateId === buyer.workshopDateId) {
        relatedIds.add(guestReg.id);
      }
    }
  }

  const relatedIdList = Array.from(relatedIds);

  const toMove = await prisma.registration.findMany({
    where: { id: { in: relatedIdList } },
    select: { id: true, status: true, workshopDateId: true },
  });

  const confirmedOnSource = toMove.filter(
    (r) =>
      r.workshopDateId === buyer.workshopDateId &&
      r.status === RegistrationStatus.CONFIRMED
  ).length;

  const guestRequest = buyer.guestInfoRequestAsBuyer;
  const pendingGuestSlots =
    guestRequest &&
    guestRequest.status === "PENDING" &&
    guestRequest.slotsCompleted < guestRequest.slotsNeeded
      ? guestRequest.slotsNeeded - guestRequest.slotsCompleted
      : 0;

  const seatsNeededOnTarget = confirmedOnSource + pendingGuestSlots;
  const available = targetDate.capacity - targetDate.soldCount;
  if (available < seatsNeededOnTarget) {
    return {
      ok: false,
      error: `Solo quedan ${available} cupo(s) en la fecha destino; se necesitan ${seatsNeededOnTarget}`,
      code: "SOLD_OUT",
    };
  }

  await prisma.$transaction(async (tx) => {
    if (confirmedOnSource > 0) {
      await tx.workshopDate.update({
        where: { id: buyer.workshopDateId },
        data: { soldCount: { decrement: confirmedOnSource } },
      });
    }

    if (seatsNeededOnTarget > 0) {
      await tx.workshopDate.update({
        where: { id: targetWorkshopDateId },
        data: { soldCount: { increment: seatsNeededOnTarget } },
      });
    }

    await tx.registration.updateMany({
      where: { id: { in: relatedIdList } },
      data: { workshopDateId: targetWorkshopDateId },
    });

    if (guestRequest) {
      await tx.guestInfoRequest.update({
        where: { id: guestRequest.id },
        data: { workshopDateId: targetWorkshopDateId },
      });
    }
  });

  const oldDate = await prisma.workshopDate.findUnique({
    where: { id: buyer.workshopDateId },
    select: { soldCount: true },
  });
  if (oldDate && oldDate.soldCount < 0) {
    await prisma.workshopDate.update({
      where: { id: buyer.workshopDateId },
      data: { soldCount: 0 },
    });
  }

  const slug = buyer.workshopDate.workshop.slug;
  if (isWorkshopSlug(slug)) {
    await syncCapacityToRedis(slug, organizationId);
  }

  return {
    ok: true,
    movedRegistrationIds: relatedIdList,
    fromWorkshopDateId: buyer.workshopDateId,
    toWorkshopDateId: targetWorkshopDateId,
    reservedGuestSlots: pendingGuestSlots,
  };
}
