import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isWorkshopSlug, type WorkshopSlug } from "@/lib/workshop-keys";
import { assertAdminApiAccess } from "@/lib/admin-api";
import { registerAttendee } from "@/lib/registrations";
import { getCertificateSendMode, isCertificatesEnabled } from "@/lib/certificates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const legacyToken = url.searchParams.get("token");
  const auth = await assertAdminApiAccess(legacyToken, request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const workshopRaw = url.searchParams.get("w");
  const workshopSlug =
    workshopRaw && isWorkshopSlug(workshopRaw) ? workshopRaw : null;

  const where = {
    workshopDate: {
      workshop: {
        organizationId: auth.organizationId,
        ...(workshopSlug ? { slug: workshopSlug as WorkshopSlug } : {}),
      },
    },
  };

  try {
    const registrations = await prisma.registration.findMany({
      where,
      orderBy: { registeredAt: "desc" },
      take: 100,
      include: {
        attendee: true,
        pass: true,
        workshopDate: { include: { workshop: true } },
        checkins: { take: 1, orderBy: { createdAt: "desc" } },
        certificate: true,
        printJobs: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    return NextResponse.json({
      certificatesEnabled: isCertificatesEnabled(),
      certificatesSendMode: getCertificateSendMode(),
      registrations: registrations.map((r) => mapRegistrationRow(r)),
    });
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code !== "P2021" && code !== "42P01") throw err;

    const registrations = await prisma.registration.findMany({
      where,
      orderBy: { registeredAt: "desc" },
      take: 100,
      include: {
        attendee: true,
        pass: true,
        workshopDate: { include: { workshop: true } },
        checkins: { take: 1, orderBy: { createdAt: "desc" } },
        certificate: true,
      },
    });

    return NextResponse.json({
      certificatesEnabled: isCertificatesEnabled(),
      certificatesSendMode: getCertificateSendMode(),
      registrations: registrations.map((r) => mapRegistrationRowWithoutPrint(r)),
    });
  }
}

function mapRegistrationRowWithoutPrint(
  r: Awaited<
    ReturnType<
      typeof prisma.registration.findMany<{
        include: {
          attendee: true;
          pass: true;
          workshopDate: { include: { workshop: true } };
          checkins: true;
          certificate: true;
        };
      }>
    >
  >[number]
) {
  return {
    id: r.id,
    attendeeName: r.attendeeName ?? r.attendee.name,
    attendeeEmail: r.attendeeEmail ?? r.attendee.email,
    attendeePhone: r.attendeePhone ?? r.attendee.phone,
    source: r.source,
    workshop: r.workshopDate.workshop.label,
    workshopSlug: r.workshopDate.workshop.slug,
    eventDate: r.workshopDate.startsAt.toISOString(),
    status: r.status,
    registeredAt: r.registeredAt.toISOString(),
    emailedAt: r.pass?.emailedAt?.toISOString() ?? null,
    emailError: r.pass?.emailError ?? null,
    checkedIn: r.checkins.length > 0,
    checkedInAt: r.checkins[0]?.createdAt.toISOString() ?? null,
    certificateEmailedAt: r.certificate?.emailedAt?.toISOString() ?? null,
    certificateError: r.certificate?.emailError ?? null,
    printStatus: null,
    printError: null,
    printPrintedAt: null,
  };
}

function mapRegistrationRow(
  r: Awaited<
    ReturnType<
      typeof prisma.registration.findMany<{
        include: {
          attendee: true;
          pass: true;
          workshopDate: { include: { workshop: true } };
          checkins: true;
          certificate: true;
          printJobs: true;
        };
      }>
    >
  >[number]
) {
  const latestPrint = r.printJobs[0];
  return {
      id: r.id,
      attendeeName: r.attendeeName ?? r.attendee.name,
      attendeeEmail: r.attendeeEmail ?? r.attendee.email,
      attendeePhone: r.attendeePhone ?? r.attendee.phone,
      source: r.source,
      workshop: r.workshopDate.workshop.label,
      workshopSlug: r.workshopDate.workshop.slug,
      eventDate: r.workshopDate.startsAt.toISOString(),
      status: r.status,
      registeredAt: r.registeredAt.toISOString(),
      emailedAt: r.pass?.emailedAt?.toISOString() ?? null,
      emailError: r.pass?.emailError ?? null,
      checkedIn: r.checkins.length > 0,
      checkedInAt: r.checkins[0]?.createdAt.toISOString() ?? null,
      certificateEmailedAt: r.certificate?.emailedAt?.toISOString() ?? null,
      certificateError: r.certificate?.emailError ?? null,
      printStatus: latestPrint?.status ?? null,
      printError: latestPrint?.error ?? null,
      printPrintedAt: latestPrint?.printedAt?.toISOString() ?? null,
    };
}

type ManualPostBody = {
  token?: unknown;
  action?: unknown;
  registrationId?: unknown;
  workshop?: unknown;
  email?: unknown;
  name?: unknown;
  phone?: unknown;
  workshopDateId?: unknown;
  sendPassEmail?: unknown;
};

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  let body: ManualPostBody;
  try {
    body = (await request.json()) as ManualPostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const legacyToken = typeof body.token === "string" ? body.token : "";
  const auth = await assertAdminApiAccess(legacyToken || null, request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const action = typeof body.action === "string" ? body.action : null;
  const registrationId =
    typeof body.registrationId === "string" ? body.registrationId.trim() : "";

  if (registrationId && action === "cancel") {
    const reg = await prisma.registration.findFirst({
      where: {
        id: registrationId,
        workshopDate: {
          workshop: { organizationId: auth.organizationId },
        },
      },
    });
    if (!reg) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }
    await prisma.registration.update({
      where: { id: registrationId },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json({ ok: true });
  }

  if (registrationId && action === "update") {
    const name =
      typeof body.name === "string" && body.name.trim() ? body.name.trim() : undefined;
    const phone =
      typeof body.phone === "string" ? body.phone.trim() || null : undefined;

    const reg = await prisma.registration.findFirst({
      where: {
        id: registrationId,
        workshopDate: {
          workshop: { organizationId: auth.organizationId },
        },
      },
    });
    if (!reg) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    await prisma.registration.update({
      where: { id: registrationId },
      data: {
        ...(name !== undefined ? { attendeeName: name } : {}),
        ...(phone !== undefined ? { attendeePhone: phone } : {}),
      },
    });

    if (name !== undefined || phone !== undefined) {
      await prisma.attendee.update({
        where: { id: reg.attendeeId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(phone !== undefined ? { phone } : {}),
        },
      });
    }

    return NextResponse.json({ ok: true });
  }

  const workshopSlug =
    typeof body.workshop === "string" && isWorkshopSlug(body.workshop)
      ? body.workshop
      : null;

  if (!workshopSlug) {
    return NextResponse.json({ error: "Taller inválido" }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  const name =
    typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;
  const phone =
    typeof body.phone === "string" && body.phone.trim()
      ? body.phone.trim()
      : null;

  const workshopDateId =
    typeof body.workshopDateId === "string" && body.workshopDateId.trim()
      ? body.workshopDateId.trim()
      : null;

  if (workshopDateId) {
    const dateRow = await prisma.workshopDate.findFirst({
      where: {
        id: workshopDateId,
        workshop: {
          slug: workshopSlug as WorkshopSlug,
          organizationId: auth.organizationId,
        },
      },
    });
    if (!dateRow) {
      return NextResponse.json(
        { error: "La fecha no pertenece a este taller" },
        { status: 400 }
      );
    }
  }

  const sendPassEmail = body.sendPassEmail !== false;
  const orderKey = workshopDateId ?? "active";
  const externalOrderId = `manual:${orderKey}:${email}`;

  const result = await registerAttendee({
    email,
    name,
    phone,
    workshopSlug,
    workshopDateId,
    externalOrderId,
    source: "manual",
    sendPassEmail,
  });

  if (!result.ok) {
    const status =
      result.code === "SOLD_OUT"
        ? 409
        : result.code === "NO_DATE"
          ? 400
          : 500;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  return NextResponse.json({
    ok: true,
    registrationId: result.registrationId,
    duplicate: result.duplicate,
  });
}
