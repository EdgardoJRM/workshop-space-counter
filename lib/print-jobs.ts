import { prisma } from "@/lib/prisma";
import { getLabelTemplateForWorkshop } from "@/lib/label-template";
import { PrintJobStatus } from "@prisma/client";
import { notifyOrganizationStaffAsync } from "@/lib/notify-staff-push";
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

  const orgId = reg.workshopDate.workshop.organizationId;
  const template = await getLabelTemplateForWorkshop(
    reg.workshopDate.workshop.slug,
    orgId
  );
  const payload = buildPrintPayload(reg, template);

  const job = await prisma.printJob.create({
    data: {
      organizationId: orgId,
      registrationId,
      checkinId,
      trigger: "auto_checkin",
      status: PrintJobStatus.PENDING,
      payload: payload as unknown as Prisma.InputJsonValue,
    },
  });

  return { created: true, jobId: job.id };
}

/** Ensures a pending label print exists after check-in (no manual reprint fallback). */
export async function queueLabelPrintForCheckin(
  registrationId: string,
  checkinId: string
): Promise<{ queued: boolean; jobId?: string; error?: string }> {
  const isClaimableJob = (status: PrintJobStatus) =>
    status === PrintJobStatus.PENDING || status === PrintJobStatus.PROCESSING;

  try {
    const linked = await prisma.printJob.findUnique({ where: { checkinId } });
    if (linked) {
      if (linked.status === PrintJobStatus.FAILED) {
        const reset = await prisma.printJob.update({
          where: { id: linked.id },
          data: { status: PrintJobStatus.PENDING, error: null },
        });
        return { queued: true, jobId: reset.id };
      }
      if (isClaimableJob(linked.status)) {
        return { queued: true, jobId: linked.id };
      }
      if (linked.status === PrintJobStatus.PRINTED) {
        return { queued: false, jobId: linked.id };
      }
    }

    const created = await createPrintJobForCheckin(registrationId, checkinId);
    if (created.jobId) {
      return { queued: true, jobId: created.jobId };
    }

    const retry = await prisma.printJob.findUnique({ where: { checkinId } });
    if (retry && isClaimableJob(retry.status)) {
      return { queued: true, jobId: retry.id };
    }
  } catch (err) {
    console.error("[print-jobs] auto checkin job failed", err);
    return {
      queued: false,
      error:
        err instanceof Error
          ? err.message
          : "No se pudo encolar la impresión del label",
    };
  }

  return {
    queued: false,
    error: "No se pudo encolar la impresión del label",
  };
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

  const existingPending = await prisma.printJob.findFirst({
    where: {
      registrationId,
      status: PrintJobStatus.PENDING,
    },
    orderBy: { createdAt: "desc" },
  });
  if (existingPending) {
    return { ok: true, jobId: existingPending.id };
  }

  const orgId = reg.workshopDate.workshop.organizationId;
  const template = await getLabelTemplateForWorkshop(
    reg.workshopDate.workshop.slug,
    orgId
  );
  const payload = buildPrintPayload(reg, template);

  const job = await prisma.printJob.create({
    data: {
      organizationId: orgId,
      registrationId,
      checkinId: null,
      trigger: "manual_reprint",
      status: PrintJobStatus.PENDING,
      payload: payload as unknown as Prisma.InputJsonValue,
    },
  });

  return { ok: true, jobId: job.id };
}

const STALE_PROCESSING_MS = 2 * 60 * 1000;

/** Jobs en PROCESSING sin confirmar (Mac apagada o crash) vuelven a PENDING. */
export async function releaseStaleProcessingPrintJobs(organizationId?: string) {
  const cutoff = new Date(Date.now() - STALE_PROCESSING_MS);
  await prisma.printJob.updateMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      status: PrintJobStatus.PROCESSING,
      updatedAt: { lt: cutoff },
    },
    data: { status: PrintJobStatus.PENDING },
  });
}

export async function claimNextPrintJob(organizationId: string) {
  await releaseStaleProcessingPrintJobs(organizationId);

  const job = await prisma.printJob.findFirst({
    where: { organizationId, status: PrintJobStatus.PENDING },
    orderBy: { createdAt: "asc" },
  });
  if (!job) return null;

  const updated = await prisma.printJob.updateMany({
    where: {
      id: job.id,
      organizationId,
      status: PrintJobStatus.PENDING,
    },
    data: {
      status: PrintJobStatus.PROCESSING,
      attempts: { increment: 1 },
    },
  });
  if (updated.count === 0) return claimNextPrintJob(organizationId);

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

  const normalizedError = errorMessage?.toLowerCase() ?? "";
  const shouldRetry =
    !normalizedError.includes("printer is offline") &&
    !normalizedError.includes("connecting to device") &&
    !normalizedError.includes("connecting-to-device");
  const maxAttempts = 3;
  if (!shouldRetry || job.attempts >= maxAttempts) {
    const failed = await prisma.printJob.update({
      where: { id: jobId },
      data: {
        status: PrintJobStatus.FAILED,
        error: errorMessage ?? "Error de impresión",
      },
    });
    notifyOrganizationStaffAsync(job.organizationId, {
      title: "Error de impresión",
      body: errorMessage ?? "Un label no pudo imprimirse tras varios intentos.",
      data: { type: "print_failed", jobId },
    });
    return failed;
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
