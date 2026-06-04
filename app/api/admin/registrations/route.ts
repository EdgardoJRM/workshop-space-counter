import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isWorkshopSlug, type WorkshopSlug } from "@/lib/workshop-keys";
import { assertAdminApiAccess } from "@/lib/admin-api";

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
  const auth = await assertAdminApiAccess(legacyToken);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const workshopRaw = url.searchParams.get("w");
  const workshopSlug =
    workshopRaw && isWorkshopSlug(workshopRaw) ? workshopRaw : null;

  const where = workshopSlug
    ? { workshopDate: { workshop: { slug: workshopSlug as WorkshopSlug } } }
    : {};

  const registrations = await prisma.registration.findMany({
    where,
    orderBy: { registeredAt: "desc" },
    take: 100,
    include: {
      attendee: true,
      pass: true,
      workshopDate: { include: { workshop: true } },
      checkins: { take: 1, orderBy: { createdAt: "desc" } },
    },
  });

  return NextResponse.json({
    registrations: registrations.map((r) => ({
      id: r.id,
      attendeeName: r.attendee.name,
      attendeeEmail: r.attendee.email,
      attendeePhone: r.attendee.phone,
      workshop: r.workshopDate.workshop.label,
      workshopSlug: r.workshopDate.workshop.slug,
      eventDate: r.workshopDate.startsAt.toISOString(),
      status: r.status,
      registeredAt: r.registeredAt.toISOString(),
      emailedAt: r.pass?.emailedAt?.toISOString() ?? null,
      emailError: r.pass?.emailError ?? null,
      checkedIn: r.checkins.length > 0,
      checkedInAt: r.checkins[0]?.createdAt.toISOString() ?? null,
    })),
  });
}
