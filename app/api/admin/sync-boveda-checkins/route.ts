import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { assertAdminApiAccess } from "@/lib/admin-api";
import { notifyLaBovedaCheckin } from "@/lib/la-boveda-webhook";
import { isWorkshopSlug, type WorkshopSlug } from "@/lib/workshop-keys";

export const dynamic = "force-dynamic";

type Body = {
  token?: unknown;
  workshop?: unknown;
  workshopDateId?: unknown;
};

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    // empty body is fine
  }

  const legacyToken = typeof body.token === "string" ? body.token : "";
  const auth = await assertAdminApiAccess(legacyToken || null, request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const workshopSlug =
    typeof body.workshop === "string" && isWorkshopSlug(body.workshop)
      ? (body.workshop as WorkshopSlug)
      : "duplica-ventas";

  const workshopDateId =
    typeof body.workshopDateId === "string" && body.workshopDateId.trim()
      ? body.workshopDateId.trim()
      : undefined;

  const registrations = await prisma.registration.findMany({
    where: {
      status: "CONFIRMED",
      checkins: { some: {} },
      workshopDate: {
        ...(workshopDateId ? { id: workshopDateId } : {}),
        workshop: {
          organizationId: auth.organizationId,
          slug: workshopSlug,
        },
      },
    },
    include: {
      attendee: true,
      checkins: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { registeredAt: "asc" },
  });
  const syncRunId = Date.now();

  const results: Array<{
    registrationId: string;
    email: string;
    name: string;
    ok: boolean;
    error?: string;
  }> = [];

  for (const reg of registrations) {
    const checkin = reg.checkins[0];
    if (!checkin) continue;

    const name =
      reg.attendeeName ?? reg.attendee.name ?? reg.attendeeEmail ?? reg.attendee.email;
    const email = (reg.attendeeEmail ?? reg.attendee.email).trim().toLowerCase();

    const result = await notifyLaBovedaCheckin({
      registrationId: reg.id,
      email,
      name,
      workshopSlug,
      checkedInAt: checkin.createdAt.toISOString(),
      externalEventId: `hp-checkin-${reg.id}-sync-${syncRunId}`,
    });

    results.push({
      registrationId: reg.id,
      email,
      name,
      ok: result.ok,
      ...(result.ok ? {} : { error: result.error }),
    });
  }

  const synced = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  return NextResponse.json({
    ok: failed.length === 0,
    workshopSlug,
    workshopDateId: workshopDateId ?? null,
    total: results.length,
    synced,
    failed: failed.length,
    results,
  });
}
