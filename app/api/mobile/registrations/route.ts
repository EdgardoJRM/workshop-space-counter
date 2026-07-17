import { NextResponse } from "next/server";
import { requireMobileStaff } from "@/lib/mobile-auth";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";
import { RegistrationStatus } from "@prisma/client";
import { getLatestPrintStatusForRegistration } from "@/lib/print-jobs";
import { registerAttendee } from "@/lib/registrations";
import { transferRegistrationOrderToWorkshopDate } from "@/lib/registration-transfer";
import { isWorkshopSlug, type WorkshopSlug } from "@/lib/workshop-keys";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  const session = await requireMobileStaff(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const workshopDateId = url.searchParams.get("workshopDateId")?.trim() ?? "";
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (!workshopDateId) {
    return NextResponse.json(
      { error: "workshopDateId is required" },
      { status: 400 }
    );
  }

  const date = await prisma.workshopDate.findFirst({
    where: {
      id: workshopDateId,
      workshop: { organizationId: session.organizationId },
    },
  });
  if (!date) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const registrations = await prisma.registration.findMany({
    where: {
      workshopDateId,
      status: RegistrationStatus.CONFIRMED,
    },
    orderBy: [{ attendeeName: "asc" }, { registeredAt: "asc" }],
    take: 500,
    include: {
      attendee: true,
      checkins: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const rows = await Promise.all(
    registrations.map(async (r) => {
      const name =
        r.attendeeName?.trim() ||
        r.attendee.name?.trim() ||
        r.attendeeEmail ||
        r.attendee.email;
      const email = r.attendeeEmail ?? r.attendee.email;
      const phone = r.attendeePhone ?? r.attendee.phone;
      const printStatus = await getLatestPrintStatusForRegistration(r.id);
      return {
        id: r.id,
        name,
        email,
        phone,
        checkedIn: r.checkins.length > 0,
        checkedInAt: r.checkins[0]?.createdAt.toISOString() ?? null,
        printStatus: printStatus?.status ?? null,
      };
    })
  );

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const hay = `${r.name} ${r.email} ${r.phone ?? ""}`.toLowerCase();
    return hay.includes(q);
  });

  return NextResponse.json({ registrations: filtered });
}

type MobilePostBody = {
  action?: unknown;
  registrationId?: unknown;
  workshopDateId?: unknown;
  workshopSlug?: unknown;
  email?: unknown;
  name?: unknown;
  phone?: unknown;
};

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  const session = await requireMobileStaff(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: MobilePostBody;
  try {
    body = (await request.json()) as MobilePostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  const registrationId =
    typeof body.registrationId === "string" ? body.registrationId.trim() : "";

  if (action === "cancel") {
    if (!registrationId) {
      return NextResponse.json({ error: "registrationId is required" }, { status: 400 });
    }
    const reg = await prisma.registration.findFirst({
      where: {
        id: registrationId,
        workshopDate: { workshop: { organizationId: session.organizationId } },
      },
    });
    if (!reg) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }
    await prisma.registration.update({
      where: { id: registrationId },
      data: { status: RegistrationStatus.CANCELLED },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "update") {
    if (!registrationId) {
      return NextResponse.json({ error: "registrationId is required" }, { status: 400 });
    }

    const name =
      typeof body.name === "string" && body.name.trim() ? body.name.trim() : undefined;
    const phone =
      typeof body.phone === "string" ? body.phone.trim() || null : undefined;
    const hasEmailField = body.email !== undefined;
    const email = hasEmailField
      ? typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : ""
      : undefined;
    const moveToDateId =
      typeof body.workshopDateId === "string" ? body.workshopDateId.trim() : "";

    if (hasEmailField && (!email || !email.includes("@"))) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const reg = await prisma.registration.findFirst({
      where: {
        id: registrationId,
        workshopDate: { workshop: { organizationId: session.organizationId } },
      },
      include: { attendee: true },
    });
    if (!reg) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    if (email !== undefined) {
      const currentEmail = (reg.attendeeEmail ?? reg.attendee.email).trim().toLowerCase();
      if (email !== currentEmail) {
        const existing = await prisma.attendee.findFirst({
          where: {
            organizationId: session.organizationId,
            email,
            id: { not: reg.attendeeId },
          },
        });
        if (existing) {
          return NextResponse.json(
            { error: "Ese email ya está registrado en otra persona" },
            { status: 409 }
          );
        }
      }
    }

    if (name !== undefined || phone !== undefined || email !== undefined) {
      await prisma.registration.update({
        where: { id: registrationId },
        data: {
          ...(name !== undefined ? { attendeeName: name } : {}),
          ...(phone !== undefined ? { attendeePhone: phone } : {}),
          ...(email !== undefined ? { attendeeEmail: email } : {}),
        },
      });

      await prisma.attendee.update({
        where: { id: reg.attendeeId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(email !== undefined ? { email } : {}),
        },
      });
    }

    if (moveToDateId && moveToDateId !== reg.workshopDateId) {
      const result = await transferRegistrationOrderToWorkshopDate(
        registrationId,
        moveToDateId,
        session.organizationId
      );
      if (!result.ok) {
        const status =
          result.code === "NOT_FOUND"
            ? 404
            : result.code === "SOLD_OUT"
              ? 409
              : 400;
        return NextResponse.json({ error: result.error, code: result.code }, { status });
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "create") {
    const workshopDateId =
      typeof body.workshopDateId === "string" ? body.workshopDateId.trim() : "";
    const workshopSlugRaw =
      typeof body.workshopSlug === "string" ? body.workshopSlug.trim() : "";
    const workshopSlug =
      workshopSlugRaw && isWorkshopSlug(workshopSlugRaw)
        ? (workshopSlugRaw as WorkshopSlug)
        : null;

    if (!workshopDateId || !workshopSlug) {
      return NextResponse.json(
        { error: "workshopDateId and workshopSlug are required" },
        { status: 400 }
      );
    }

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const name =
      typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;
    const phone =
      typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;

    const dateRow = await prisma.workshopDate.findFirst({
      where: {
        id: workshopDateId,
        workshop: {
          slug: workshopSlug,
          organizationId: session.organizationId,
        },
      },
    });
    if (!dateRow) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const result = await registerAttendee({
      email,
      name,
      phone,
      workshopSlug,
      workshopDateId,
      externalOrderId: `mobile:${workshopDateId}:${email}`,
      source: "mobile",
      sendPassEmail: false,
      organizationId: session.organizationId,
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

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
