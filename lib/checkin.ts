import { prisma } from "@/lib/prisma";
import { hashPassToken } from "@/lib/pass-tokens";
import { sendDuplicaVentasCheckinResourcesEmail } from "@/lib/duplica-ventas-checkin-email";
import { notifyLaBovedaCheckin } from "@/lib/la-boveda-webhook";
import { notifyOrganizationStaffAsync } from "@/lib/notify-staff-push";
import { sendImmediateCheckinEmails } from "@/lib/email-sequence";
import { isWorkshopSlug } from "@/lib/workshop-keys";
import { createPrintJobForCheckin } from "@/lib/print-jobs";
import { RegistrationStatus } from "@prisma/client";

export type CheckinResult =
  | {
      ok: true;
      status: "checked_in" | "already_checked_in";
      attendeeName: string;
      workshopLabel: string;
      checkedInAt: string;
      printJobQueued?: boolean;
      printJobId?: string;
      printError?: string;
    }
  | { ok: false; error: string; code: string };

type RegistrationWithRelations = {
  id: string;
  status: RegistrationStatus;
  attendeeName: string | null;
  attendeeEmail: string | null;
  workshopDateId: string;
  attendee: { name: string | null; email: string };
  workshopDate: {
    workshop: { label: string; organizationId: string; slug: string };
  };
  checkins: { createdAt: Date }[];
};

async function performCheckinOnRegistration(
  reg: RegistrationWithRelations,
  meta: { checkedInBy?: string; userAgent?: string }
): Promise<CheckinResult> {
  const attendeeName =
    reg.attendeeName ?? reg.attendee.name ?? reg.attendeeEmail ?? reg.attendee.email;

  if (reg.status !== RegistrationStatus.CONFIRMED) {
    return { ok: false, error: "Registro no confirmado", code: "NOT_CONFIRMED" };
  }

  const existing = reg.checkins[0];
  if (existing) {
    return {
      ok: true,
      status: "already_checked_in",
      attendeeName,
      workshopLabel: reg.workshopDate.workshop.label,
      checkedInAt: existing.createdAt.toISOString(),
    };
  }

  const checkin = await prisma.$transaction(async (tx) => {
    const created = await tx.checkin.create({
      data: {
        registrationId: reg.id,
        checkedInBy: meta.checkedInBy ?? "staff",
        userAgent: meta.userAgent ?? null,
      },
    });

    await tx.workshopDate.update({
      where: { id: reg.workshopDateId },
      data: { checkedInCount: { increment: 1 } },
    });

    return created;
  });

  let printJobQueued = false;
  let printJobId: string | undefined;
  let printError: string | undefined;

  try {
    const printResult = await createPrintJobForCheckin(reg.id, checkin.id);
    printJobQueued = printResult.created;
    printJobId = printResult.jobId;
  } catch (err) {
    console.error("[checkin] print job failed", err);
    printError =
      "Check-in guardado, pero no se pudo encolar el label. Ejecuta el SQL de PrintJob en Supabase o usa Reimprimir en admin.";
  }

  notifyOrganizationStaffAsync(
    reg.workshopDate.workshop.organizationId,
    {
      title: "Check-in",
      body: `${attendeeName} — ${reg.workshopDate.workshop.label}`,
      data: { type: "checkin", registrationId: reg.id },
    },
    { excludeEmail: meta.checkedInBy }
  );

  const workshopSlug = reg.workshopDate.workshop.slug;
  const isDuplicaVentas =
    isWorkshopSlug(workshopSlug) && workshopSlug === "duplica-ventas";

  if (isDuplicaVentas) {
    void notifyLaBovedaCheckin({
      registrationId: reg.id,
      email: reg.attendeeEmail ?? reg.attendee.email,
      name: attendeeName,
      workshopSlug,
      checkedInAt: checkin.createdAt.toISOString(),
    }).catch((err) => {
      console.error("[checkin] la-boveda webhook failed", err);
    });

    void sendDuplicaVentasCheckinResourcesEmail({
      to: reg.attendeeEmail ?? reg.attendee.email,
      attendeeName,
    }).catch((err) => {
      console.error("[checkin] duplica-ventas resources email failed", err);
    });
  }

  void sendImmediateCheckinEmails(reg.id).catch((err) => {
    console.error("[checkin] automated email failed", err);
  });

  return {
    ok: true,
    status: "checked_in",
    attendeeName,
    workshopLabel: reg.workshopDate.workshop.label,
    checkedInAt: checkin.createdAt.toISOString(),
    printJobQueued,
    printJobId,
    printError,
  };
}

const registrationInclude = {
  attendee: true,
  workshopDate: { include: { workshop: true } },
  checkins: { orderBy: { createdAt: "desc" as const }, take: 1 },
};

export async function processCheckinScan(
  token: string,
  meta: {
    checkedInBy?: string;
    userAgent?: string;
    expectedWorkshopDateId?: string;
  }
): Promise<CheckinResult> {
  const normalized = token.startsWith("hp:") ? token.slice(3) : token;
  const tokenHash = hashPassToken(normalized);

  const pass = await prisma.pass.findUnique({
    where: { tokenHash },
    include: {
      registration: { include: registrationInclude },
    },
  });

  if (!pass || pass.revoked) {
    return { ok: false, error: "Pase no válido", code: "INVALID_PASS" };
  }

  if (
    meta.expectedWorkshopDateId &&
    pass.registration.workshopDateId !== meta.expectedWorkshopDateId
  ) {
    return {
      ok: false,
      error: "Este pase es para otro evento. Cambia la fecha arriba.",
      code: "WRONG_EVENT",
    };
  }

  return performCheckinOnRegistration(pass.registration, meta);
}

export async function processCheckinByRegistrationId(
  registrationId: string,
  workshopDateId: string,
  meta: { checkedInBy?: string; userAgent?: string }
): Promise<CheckinResult> {
  const reg = await prisma.registration.findFirst({
    where: { id: registrationId, workshopDateId },
    include: registrationInclude,
  });

  if (!reg) {
    return {
      ok: false,
      error: "Persona no encontrada en esta fecha",
      code: "NOT_FOUND",
    };
  }

  return performCheckinOnRegistration(reg, meta);
}
