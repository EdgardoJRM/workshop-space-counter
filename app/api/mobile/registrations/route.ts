import { NextResponse } from "next/server";
import { requireMobileStaff } from "@/lib/mobile-auth";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";
import { RegistrationStatus } from "@prisma/client";
import { getLatestPrintStatusForRegistration } from "@/lib/print-jobs";

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
