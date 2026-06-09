import { readFileSync } from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import {
  generateCertificateToken,
  getCertificatePdfUrl,
  getCertificatePublicUrl,
  hashCertificateToken,
} from "@/lib/certificate-tokens";
import { sendCertificateEmail } from "@/lib/email";
import { formatWorkshopDateTime, WORKSHOP_TIMEZONE } from "@/lib/workshop-datetime";
import { RegistrationStatus } from "@prisma/client";

export const DEFAULT_WORKSHOP_DURATION_HOURS = 8;

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "assets/certificates/duplica-ventas-template.pdf"
);

/** Posiciones calibradas para plantilla landscape 842×596 (origen abajo-izquierda). */
const LAYOUT = {
  workshop: { y: 338, size: 14, box: { x: 80, y: 328, w: 680, h: 28 } },
  name: { y: 295, size: 26, box: { x: 80, y: 278, w: 680, h: 38 } },
  date: { y: 88, size: 12, box: { x: 280, y: 78, w: 280, h: 22 } },
} as const;

export type CertificateView = {
  attendeeName: string;
  attendeeEmail: string;
  workshopLabel: string;
  workshopTitle: string;
  eventDateLabel: string;
  certificateDateLabel: string;
  certificateUrl: string;
  pdfUrl: string;
};

export function formatCertificateDate(d: Date): string {
  const month = new Intl.DateTimeFormat("es-PR", {
    timeZone: WORKSHOP_TIMEZONE,
    month: "long",
  }).format(d);
  const day = new Intl.DateTimeFormat("es-PR", {
    timeZone: WORKSHOP_TIMEZONE,
    day: "2-digit",
  }).format(d);
  const year = new Intl.DateTimeFormat("es-PR", {
    timeZone: WORKSHOP_TIMEZONE,
    year: "numeric",
  }).format(d);
  const capMonth = month.charAt(0).toUpperCase() + month.slice(1);
  return `${capMonth}/${day}/${year}`;
}

export function workshopEndsAt(startsAt: Date, durationHours = DEFAULT_WORKSHOP_DURATION_HOURS): Date {
  return new Date(startsAt.getTime() + durationHours * 60 * 60 * 1000);
}

export function isWorkshopEndDueForCertificates(
  startsAt: Date,
  now: Date,
  options?: { windowMs?: number; durationHours?: number }
): boolean {
  const windowMs = options?.windowMs ?? 25 * 60 * 60 * 1000;
  const durationHours = options?.durationHours ?? DEFAULT_WORKSHOP_DURATION_HOURS;
  const endsAt = workshopEndsAt(startsAt, durationHours);
  const windowStart = new Date(now.getTime() - windowMs);
  return endsAt <= now && endsAt >= windowStart;
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = rgb(0.13, 0.13, 0.13)
) {
  const pageWidth = page.getWidth();
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (pageWidth - textWidth) / 2,
    y,
    size,
    font,
    color,
  });
}

function whiteout(page: PDFPage, box: { x: number; y: number; w: number; h: number }) {
  page.drawRectangle({
    x: box.x,
    y: box.y,
    width: box.w,
    height: box.h,
    color: rgb(1, 1, 1),
    borderWidth: 0,
  });
}

export type CertificatePdfInput = {
  attendeeName: string;
  workshopTitle: string;
  certificateDate: Date;
};

export async function buildCertificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
  const templateBytes = readFileSync(TEMPLATE_PATH);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPage(0);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const dateLabel = formatCertificateDate(input.certificateDate);
  const name = input.attendeeName.trim() || "Participante";
  const workshop = input.workshopTitle.trim() || "Taller";

  whiteout(page, LAYOUT.workshop.box);
  whiteout(page, LAYOUT.name.box);
  whiteout(page, LAYOUT.date.box);

  drawCenteredText(page, workshop, LAYOUT.workshop.y, font, LAYOUT.workshop.size);
  drawCenteredText(page, name, LAYOUT.name.y, fontBold, LAYOUT.name.size);
  drawCenteredText(page, dateLabel, LAYOUT.date.y, font, LAYOUT.date.size);

  return pdfDoc.save();
}

const registrationInclude = {
  attendee: true,
  checkins: { take: 1 },
  certificate: true,
  workshopDate: { include: { workshop: true } },
} as const;

export function registrationEligibleForCertificate(reg: {
  status: RegistrationStatus;
  checkins: unknown[];
}): boolean {
  return reg.status === RegistrationStatus.CONFIRMED && reg.checkins.length > 0;
}

export async function createOrRotateCertificateToken(
  registrationId: string,
  options?: { rotate?: boolean }
): Promise<
  | { ok: true; token: string; created: boolean }
  | { ok: false; error: string; code: string }
> {
  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: registrationInclude,
  });

  if (!reg) {
    return { ok: false, error: "Registro no encontrado", code: "NOT_FOUND" };
  }

  if (!registrationEligibleForCertificate(reg)) {
    return {
      ok: false,
      error: "Solo asistentes con check-in reciben certificado",
      code: "NOT_ELIGIBLE",
    };
  }

  const token = generateCertificateToken();
  const tokenHash = hashCertificateToken(token);

  if (reg.certificate) {
    if (!options?.rotate) {
      return {
        ok: false,
        error: "El certificado ya existe; rota el token para reenviar",
        code: "TOKEN_UNAVAILABLE",
      };
    }

    await prisma.certificate.update({
      where: { id: reg.certificate.id },
      data: { tokenHash, emailError: null },
    });
    return { ok: true, token, created: false };
  }

  try {
    await prisma.certificate.create({
      data: {
        registrationId: reg.id,
        tokenHash,
      },
    });
    return { ok: true, token, created: true };
  } catch {
    const existing = await prisma.certificate.findUnique({
      where: { registrationId: reg.id },
    });
    if (!existing) {
      return { ok: false, error: "No se pudo crear certificado", code: "CREATE_FAILED" };
    }

    if (!options?.rotate) {
      return {
        ok: false,
        error: "El certificado ya existe; rota el token para reenviar",
        code: "TOKEN_UNAVAILABLE",
      };
    }

    await prisma.certificate.update({
      where: { id: existing.id },
      data: { tokenHash: hashCertificateToken(token), emailError: null },
    });
    return { ok: true, token, created: false };
  }
}

export async function getCertificateByToken(token: string) {
  const tokenHash = hashCertificateToken(token);
  const cert = await prisma.certificate.findUnique({
    where: { tokenHash },
    include: {
      registration: {
        include: registrationInclude,
      },
    },
  });
  if (!cert) return null;

  const reg = cert.registration;
  const attendeeName =
    reg.attendeeName ?? reg.attendee.name ?? reg.attendeeEmail ?? reg.attendee.email;
  const workshopTitle =
    reg.workshopDate.title?.trim() || reg.workshopDate.workshop.label;

  return {
    certificate: cert,
    registration: reg,
    view: {
      attendeeName,
      attendeeEmail: reg.attendeeEmail ?? reg.attendee.email,
      workshopLabel: reg.workshopDate.workshop.label,
      workshopTitle,
      eventDateLabel: formatWorkshopDateTime(reg.workshopDate.startsAt),
      certificateDateLabel: formatCertificateDate(reg.workshopDate.startsAt),
      certificateUrl: getCertificatePublicUrl(token),
      pdfUrl: getCertificatePdfUrl(token),
    } satisfies CertificateView,
  };
}

export async function buildCertificatePdfForRegistration(
  registrationId: string
): Promise<Uint8Array | null> {
  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: registrationInclude,
  });
  if (!reg || !registrationEligibleForCertificate(reg)) return null;

  const attendeeName =
    reg.attendeeName ?? reg.attendee.name ?? reg.attendeeEmail ?? reg.attendee.email;
  const workshopTitle =
    reg.workshopDate.title?.trim() || reg.workshopDate.workshop.label;

  return buildCertificatePdf({
    attendeeName,
    workshopTitle,
    certificateDate: reg.workshopDate.startsAt,
  });
}

export async function sendCertificateForRegistration(
  registrationId: string,
  options?: { forceResend?: boolean }
): Promise<{ ok: true } | { ok: false; error: string; code?: string }> {
  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: registrationInclude,
  });

  if (!reg) {
    return { ok: false, error: "Registro no encontrado", code: "NOT_FOUND" };
  }

  if (!registrationEligibleForCertificate(reg)) {
    return {
      ok: false,
      error: "Solo asistentes con check-in reciben certificado",
      code: "NOT_ELIGIBLE",
    };
  }

  if (reg.certificate?.emailedAt && !options?.forceResend) {
    return { ok: true };
  }

  const ensured = await createOrRotateCertificateToken(registrationId, {
    rotate: Boolean(reg.certificate || options?.forceResend),
  });
  if (!ensured.ok) {
    return { ok: false, error: ensured.error, code: ensured.code };
  }

  const attendeeName =
    reg.attendeeName ?? reg.attendee.name ?? reg.attendeeEmail ?? reg.attendee.email;
  const workshopLabel = reg.workshopDate.workshop.label;
  const eventDate = formatWorkshopDateTime(reg.workshopDate.startsAt);
  const certificateUrl = getCertificatePublicUrl(ensured.token);

  const emailResult = await sendCertificateEmail({
    to: reg.attendeeEmail ?? reg.attendee.email,
    attendeeName,
    workshopLabel,
    eventDate,
    certificateUrl,
  });

  const certRow = await prisma.certificate.findUnique({
    where: { registrationId },
  });

  if (emailResult.ok) {
    if (certRow) {
      await prisma.certificate.update({
        where: { id: certRow.id },
        data: { emailedAt: new Date(), emailError: null },
      });
    }
    return { ok: true };
  }

  if (certRow) {
    await prisma.certificate.update({
      where: { id: certRow.id },
      data: { emailError: emailResult.error },
    });
  }

  return { ok: false, error: emailResult.error, code: "EMAIL_FAILED" };
}

export type ProcessCertificatesResult = {
  sent: number;
  failed: number;
  skipped: number;
  datesProcessed: number;
};

export async function processDueCertificates(options?: {
  now?: Date;
  windowMs?: number;
  durationHours?: number;
}): Promise<ProcessCertificatesResult> {
  const now = options?.now ?? new Date();
  const windowMs = options?.windowMs ?? 25 * 60 * 60 * 1000;
  const durationHours = options?.durationHours ?? DEFAULT_WORKSHOP_DURATION_HOURS;
  const durationMs = durationHours * 60 * 60 * 1000;

  const windowEnd = now;
  const windowStart = new Date(now.getTime() - windowMs);

  const workshopDates = await prisma.workshopDate.findMany({
    where: {
      startsAt: {
        gte: new Date(windowStart.getTime() - durationMs),
        lte: new Date(windowEnd.getTime() - durationMs),
      },
    },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let datesProcessed = 0;

  for (const workshopDate of workshopDates) {
    const endsAt = workshopEndsAt(workshopDate.startsAt, durationHours);
    if (endsAt > now) continue;
    if (endsAt < windowStart || endsAt > windowEnd) continue;
    datesProcessed += 1;

    const registrations = await prisma.registration.findMany({
      where: {
        workshopDateId: workshopDate.id,
        status: RegistrationStatus.CONFIRMED,
        checkins: { some: {} },
      },
      include: { certificate: true },
    });

    for (const reg of registrations) {
      if (reg.certificate?.emailedAt) {
        skipped += 1;
        continue;
      }

      const result = await sendCertificateForRegistration(reg.id);
      if (result.ok) {
        sent += 1;
      } else if (result.code === "NOT_ELIGIBLE") {
        skipped += 1;
      } else {
        failed += 1;
      }
    }
  }

  return {
    sent,
    failed,
    skipped,
    datesProcessed,
  };
}

export async function resendCertificateEmail(registrationId: string): Promise<{
  ok: boolean;
  error?: string;
  code?: string;
}> {
  const result = await sendCertificateForRegistration(registrationId, {
    forceResend: true,
  });
  if (!result.ok) {
    return { ok: false, error: result.error, code: result.code };
  }
  return { ok: true };
}
