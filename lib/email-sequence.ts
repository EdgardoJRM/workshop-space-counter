import { prisma } from "@/lib/prisma";
import { sendHtmlEmail, renderEmailTemplate } from "@/lib/email";
import { emailHtmlToPlainText } from "@/lib/email-template-text";
import { formatWorkshopDateTime } from "@/lib/workshop-datetime";
import { RegistrationStatus } from "@prisma/client";

export type EmailTemplateAnchor = "event_start" | "checkin";

export const EMAIL_SEQUENCE_WINDOW_MS = 25 * 60 * 60 * 1000;

export function normalizeEmailTemplateAnchor(value: unknown): EmailTemplateAnchor {
  if (typeof value === "string" && value.trim().toLowerCase() === "checkin") {
    return "checkin";
  }
  return "event_start";
}

export function formatEmailDelayLabel(
  delayHours: number,
  anchor: EmailTemplateAnchor = "event_start"
): string {
  const reference =
    anchor === "checkin" ? "del check-in" : "del inicio del evento";

  if (delayHours === 0) {
    return anchor === "checkin"
      ? "Al momento del check-in"
      : "Al momento del evento";
  }

  if (delayHours < 24) {
    return `${delayHours}h después ${reference}`;
  }

  const days = Math.floor(delayHours / 24);
  const rem = delayHours % 24;
  if (rem === 0) {
    return `${days} día${days > 1 ? "s" : ""} después ${reference}`;
  }
  return `${days}d ${rem}h después ${reference}`;
}

type RegistrationForEmail = {
  id: string;
  attendeeName: string | null;
  attendeeEmail: string | null;
  attendee: { name: string | null; email: string };
  workshopDate: {
    startsAt: Date;
    venue: string | null;
    workshop: { label: string };
  };
};

type TemplateForSend = {
  id: string;
  subject: string;
  htmlBody: string;
};

function buildTemplateVars(
  registration: RegistrationForEmail
): Record<string, string> {
  const attendeeName =
    registration.attendeeName ??
    registration.attendee.name ??
    "Participante";
  const attendeeEmail =
    registration.attendeeEmail ?? registration.attendee.email;

  return {
    name: attendeeName,
    email: attendeeEmail,
    workshop: registration.workshopDate.workshop.label,
    eventDate: formatWorkshopDateTime(registration.workshopDate.startsAt),
    venue: registration.workshopDate.venue ?? "",
  };
}

export async function sendTemplateToRegistration(
  template: TemplateForSend,
  registration: RegistrationForEmail
): Promise<"sent" | "failed" | "skipped"> {
  const existing = await prisma.emailLog.findUnique({
    where: {
      templateId_registrationId: {
        templateId: template.id,
        registrationId: registration.id,
      },
    },
  });

  if (existing) return "skipped";

  const vars = buildTemplateVars(registration);
  const html = renderEmailTemplate(template.htmlBody, vars);
  const subject = renderEmailTemplate(template.subject, vars);
  const attendeeEmail = registration.attendeeEmail ?? registration.attendee.email;

  const result = await sendHtmlEmail({
    to: attendeeEmail,
    subject,
    htmlBody: html,
    textBody: emailHtmlToPlainText(html),
  });

  await prisma.emailLog.create({
    data: {
      templateId: template.id,
      registrationId: registration.id,
      status: result.ok ? "sent" : "failed",
      error: result.ok ? null : result.error,
    },
  });

  return result.ok ? "sent" : "failed";
}

const registrationInclude = {
  attendee: true,
  workshopDate: { include: { workshop: true } },
} as const;

/** Envía plantillas de check-in con delay 0 justo después del escaneo. */
export async function sendImmediateCheckinEmails(
  registrationId: string
): Promise<void> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: registrationInclude,
  });

  if (!registration || registration.status !== RegistrationStatus.CONFIRMED) {
    return;
  }

  const templates = await prisma.emailTemplate.findMany({
    where: {
      organizationId: registration.workshopDate.workshop.organizationId,
      active: true,
      anchor: "checkin",
      delayHours: 0,
    },
  });

  for (const template of templates) {
    await sendTemplateToRegistration(template, registration);
  }
}

export type ProcessEmailSequenceResult = {
  sent: number;
  failed: number;
  skipped: number;
  templatesProcessed: number;
};

export async function processDueEmailTemplates(options?: {
  now?: Date;
  windowMs?: number;
}): Promise<ProcessEmailSequenceResult> {
  const now = options?.now ?? new Date();
  const nowMs = now.getTime();
  const windowMs = options?.windowMs ?? EMAIL_SEQUENCE_WINDOW_MS;

  const templates = await prisma.emailTemplate.findMany({
    where: { active: true },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const template of templates) {
    const anchor = normalizeEmailTemplateAnchor(template.anchor);
    const delayMs = template.delayHours * 60 * 60 * 1000;
    const windowEnd = new Date(nowMs - delayMs);
    const windowStart = new Date(nowMs - delayMs - windowMs);

    if (anchor === "event_start") {
      const workshopDates = await prisma.workshopDate.findMany({
        where: {
          workshop: { organizationId: template.organizationId },
          startsAt: {
            gte: windowStart,
            lte: windowEnd,
          },
        },
        include: { workshop: true },
      });

      for (const workshopDate of workshopDates) {
        const registrations = await prisma.registration.findMany({
          where: {
            workshopDateId: workshopDate.id,
            status: RegistrationStatus.CONFIRMED,
          },
          include: registrationInclude,
        });

        for (const registration of registrations) {
          const outcome = await sendTemplateToRegistration(template, registration);
          if (outcome === "sent") sent += 1;
          else if (outcome === "failed") failed += 1;
          else skipped += 1;
        }
      }
      continue;
    }

    const checkins = await prisma.checkin.findMany({
      where: {
        createdAt: {
          gte: windowStart,
          lte: windowEnd,
        },
        registration: {
          status: RegistrationStatus.CONFIRMED,
          workshopDate: {
            workshop: { organizationId: template.organizationId },
          },
        },
      },
      include: {
        registration: { include: registrationInclude },
      },
    });

    for (const checkin of checkins) {
      if (template.delayHours === 0) {
        skipped += 1;
        continue;
      }

      const outcome = await sendTemplateToRegistration(
        template,
        checkin.registration
      );
      if (outcome === "sent") sent += 1;
      else if (outcome === "failed") failed += 1;
      else skipped += 1;
    }
  }

  return {
    sent,
    failed,
    skipped,
    templatesProcessed: templates.length,
  };
}
