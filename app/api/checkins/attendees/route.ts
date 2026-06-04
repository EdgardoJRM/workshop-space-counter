import { NextResponse } from "next/server";
import { isStaffAuthenticated } from "@/lib/staff-auth";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";
import { RegistrationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  const staffOk = await isStaffAuthenticated();
  if (!staffOk) {
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

  const filtered = registrations
    .map((r) => {
      const name =
        r.attendeeName?.trim() ||
        r.attendee.name?.trim() ||
        r.attendeeEmail ||
        r.attendee.email;
      const email = r.attendeeEmail ?? r.attendee.email;
      const phone = r.attendeePhone ?? r.attendee.phone;
      return {
        id: r.id,
        name,
        email,
        phone,
        checkedIn: r.checkins.length > 0,
        checkedInAt: r.checkins[0]?.createdAt.toISOString() ?? null,
      };
    })
    .filter((r) => {
      if (!q) return true;
      const hay = `${r.name} ${r.email} ${r.phone ?? ""}`.toLowerCase();
      return hay.includes(q);
    });

  return NextResponse.json({ attendees: filtered });
}
