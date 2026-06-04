import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { sendHtmlEmail, renderEmailTemplate } from "@/lib/email";
import { RegistrationStatus } from "@prisma/client";
import { formatWorkshopDateTime } from "@/lib/workshop-datetime";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Hobby: cron diario en vercel.json. Ventana ~25h para no perder envíos entre ejecuciones.
const WINDOW_MS = 25 * 60 * 60 * 1000;

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  return querySecret === secret;
}

export async function GET(request: Request) {
  return runSendEmails(request);
}

export async function POST(request: Request) {
  return runSendEmails(request);
}

async function runSendEmails(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  const now = Date.now();
  const templates = await prisma.emailTemplate.findMany({
    where: { active: true },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const template of templates) {
    const delayMs = template.delayHours * 60 * 60 * 1000;
    const windowEnd = new Date(now - delayMs);
    const windowStart = new Date(now - delayMs - WINDOW_MS);

    const workshopDates = await prisma.workshopDate.findMany({
      where: {
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
        include: { attendee: true },
      });

      for (const registration of registrations) {
        const existing = await prisma.emailLog.findUnique({
          where: {
            templateId_registrationId: {
              templateId: template.id,
              registrationId: registration.id,
            },
          },
        });

        if (existing) {
          skipped += 1;
          continue;
        }

        const attendeeName =
          registration.attendeeName ??
          registration.attendee.name ??
          "Participante";
        const attendeeEmail =
          registration.attendeeEmail ?? registration.attendee.email;
        const vars = {
          name: attendeeName,
          email: attendeeEmail,
          workshop: workshopDate.workshop.label,
          eventDate: formatWorkshopDateTime(workshopDate.startsAt),
          venue: workshopDate.venue ?? "",
        };

        const html = renderEmailTemplate(template.htmlBody, vars);
        const subject = renderEmailTemplate(template.subject, vars);

        const result = await sendHtmlEmail({
          to: attendeeEmail,
          subject,
          htmlBody: html,
        });

        if (result.ok) {
          await prisma.emailLog.create({
            data: {
              templateId: template.id,
              registrationId: registration.id,
              status: "sent",
            },
          });
          sent += 1;
        } else {
          await prisma.emailLog.create({
            data: {
              templateId: template.id,
              registrationId: registration.id,
              status: "failed",
              error: result.error,
            },
          });
          failed += 1;
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    skipped,
    templatesProcessed: templates.length,
  });
}
