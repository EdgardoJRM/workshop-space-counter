import { prisma } from "@/lib/prisma";
import { getLabelTemplateForWorkshop } from "@/lib/label-template";
import { PrintJobStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export type PrintJobPayload = {
  name: string;
  email?: string;
  workshopLabel?: string;
  fontLarge: number;
  fontSmall: number;
  mediaSize: string;
  showEmail: boolean;
  showWorkshop: boolean;
};

type RegistrationForPrint = {
  id: string;
  attendeeName: string | null;
  attendeeEmail: string | null;
  attendee: { name: string | null; email: string };
  workshopDate: {
    workshop: { slug: string; label: string };
  };
};

export function buildPrintPayload(
  reg: RegistrationForPrint,
  template: Awaited<ReturnType<typeof getLabelTemplateForWorkshop>>
): PrintJobPayload {
  const name =
    reg.attendeeName?.trim() ||
    reg.attendee.name?.trim() ||
    reg.attendeeEmail ||
    reg.attendee.email;

  return {
    name,
    email: reg.attendeeEmail ?? reg.attendee.email,
    workshopLabel: reg.workshopDate.workshop.label,
    fontLarge: template.fontLarge,
    fontSmall: template.fontSmall,
    mediaSize: template.mediaSize,
    showEmail: template.showEmail,
    showWorkshop: template.showWorkshop,
  };
}

export async function createPrintJobForCheckin(
  registrationId: string,
  checkinId: string
): Promise<{ created: boolean; jobId?: string }> {
  const existing = await prisma.printJob.findUnique({
    where: { checkinId },
  });
  if (existing) {
    return { created: false, jobId: existing.id };
  }

  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      attendee: true,
      workshopDate: { include: { workshop: true } },
    },
  });
  if (!reg) return { created: false };

  const template = await getLabelTemplateForWorkshop(
    reg.workshopDate.workshop.slug
  );
  const payload = buildPrintPayload(reg, template);

  const job = await prisma.printJob.create({
    data: {
      registrationId,
      checkinId,
      trigger: "auto_checkin",
      status: PrintJobStatus.PENDING,
      payload: payload as unknown as Prisma.InputJsonValue,
    },
  });

  return { created: true, jobId: job.id };
}

export async function createManualReprintJob(
  registrationId: string
): Promise<{ ok: true; jobId: string } | { ok: false; error: string }> {
  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      attendee: true,
      workshopDate: { include: { workshop: true } },
    },
  });
  if (!reg) {
    return { ok: false, error: "Registro no encontrado" };
  }

  const template = await getLabelTemplateForWorkshop(
    reg.workshopDate.workshop.slug
  );
  const payload = buildPrintPayload(reg, template);

  const job = await prisma.printJob.create({
    data: {
      registrationId,
      checkinId: null,
      trigger: "manual_reprint",
      status: PrintJobStatus.PENDING,
      payload: payload as unknown as Prisma.InputJsonValue,
    },
  });

  return { ok: true, jobId: job.id };
}

export async function claimNextPrintJob() {
  const job = await prisma.printJob.findFirst({
    where: { status: PrintJobStatus.PENDING },
    orderBy: { createdAt: "asc" },
  });
  if (!job) return null;

  const updated = await prisma.printJob.updateMany({
    where: { id: job.id, status: PrintJobStatus.PENDING },
    data: {
      status: PrintJobStatus.PROCESSING,
      attempts: { increment: 1 },
    },
  });
  if (updated.count === 0) return claimNextPrintJob();

  return prisma.printJob.findUnique({ where: { id: job.id } });
}

export async function completePrintJobWithRetry(
  jobId: string,
  success: boolean,
  errorMessage?: string
) {
  const job = await prisma.printJob.findUnique({ where: { id: jobId } });
  if (!job) return null;

  if (success) {
    return prisma.printJob.update({
      where: { id: jobId },
      data: {
        status: PrintJobStatus.PRINTED,
        printedAt: new Date(),
        error: null,
      },
    });
  }

  const maxAttempts = 3;
  if (job.attempts >= maxAttempts) {
    return prisma.printJob.update({
      where: { id: jobId },
      data: {
        status: PrintJobStatus.FAILED,
        error: errorMessage ?? "Error de impresión",
      },
    });
  }

  return prisma.printJob.update({
    where: { id: jobId },
    data: {
      status: PrintJobStatus.PENDING,
      error: errorMessage ?? "Error de impresión",
    },
  });
}

export async function getLatestPrintStatusForRegistration(
  registrationId: string
): Promise<{
  status: PrintJobStatus | null;
  printedAt: string | null;
  error: string | null;
} | null> {
  const job = await prisma.printJob.findFirst({
    where: { registrationId },
    orderBy: { createdAt: "desc" },
  });
  if (!job) return null;
  return {
    status: job.status,
    printedAt: job.printedAt?.toISOString() ?? null,
    error: job.error,
  };
}
