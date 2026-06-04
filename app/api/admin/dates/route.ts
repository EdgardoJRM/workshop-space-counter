import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isWorkshopSlug, type WorkshopSlug } from "@/lib/workshop-keys";
import { syncCapacityToRedis } from "@/lib/capacity";
import { assertAdminApiAccess } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ dates: [] });
  }

  const url = new URL(request.url);
  const legacyToken = url.searchParams.get("token");
  const auth = await assertAdminApiAccess(legacyToken);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const w = url.searchParams.get("w");
  const slug = w && isWorkshopSlug(w) ? w : null;

  const dates = await prisma.workshopDate.findMany({
    where: slug ? { workshop: { slug } } : undefined,
    orderBy: { startsAt: "asc" },
    include: { workshop: true },
    take: 50,
  });

  return NextResponse.json({
    dates: dates.map((d) => ({
      id: d.id,
      workshopSlug: d.workshop.slug,
      workshopLabel: d.workshop.label,
      title: d.title,
      startsAt: d.startsAt.toISOString(),
      venue: d.venue,
      capacity: d.capacity,
      soldCount: d.soldCount,
      available: Math.max(0, d.capacity - d.soldCount),
      isActive: d.isActive,
      checkedInCount: d.checkedInCount,
    })),
  });
}

type PostBody = {
  token?: unknown;
  workshop?: unknown;
  title?: unknown;
  startsAt?: unknown;
  venue?: unknown;
  capacity?: unknown;
  isActive?: unknown;
  dateId?: unknown;
};

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const legacyToken = typeof body.token === "string" ? body.token : "";
  const auth = await assertAdminApiAccess(legacyToken || null);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const dateId = typeof body.dateId === "string" ? body.dateId : null;

  if (dateId) {
    const capacity =
      typeof body.capacity === "number" && body.capacity >= 0
        ? Math.floor(body.capacity)
        : undefined;
    const isActive =
      typeof body.isActive === "boolean" ? body.isActive : undefined;

    if (isActive === true) {
      const existing = await prisma.workshopDate.findUnique({
        where: { id: dateId },
        select: { workshopId: true },
      });
      if (existing) {
        await prisma.workshopDate.updateMany({
          where: { workshopId: existing.workshopId, isActive: true },
          data: { isActive: false },
        });
      }
    }

    const updated = await prisma.workshopDate.update({
      where: { id: dateId },
      data: {
        ...(capacity !== undefined ? { capacity } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(typeof body.title === "string" ? { title: body.title } : {}),
        ...(typeof body.venue === "string" ? { venue: body.venue } : {}),
        ...(typeof body.startsAt === "string"
          ? { startsAt: new Date(body.startsAt) }
          : {}),
      },
      include: { workshop: true },
    });

    if (isWorkshopSlug(updated.workshop.slug)) {
      await syncCapacityToRedis(updated.workshop.slug);
    }

    return NextResponse.json({ ok: true, date: updated });
  }

  const workshopSlug =
    typeof body.workshop === "string" && isWorkshopSlug(body.workshop)
      ? body.workshop
      : null;

  if (!workshopSlug) {
    return NextResponse.json({ error: "Invalid workshop slug" }, { status: 400 });
  }

  const workshop = await prisma.workshop.findUnique({
    where: { slug: workshopSlug },
  });
  if (!workshop) {
    return NextResponse.json({ error: "Workshop not found" }, { status: 404 });
  }

  const startsAt =
    typeof body.startsAt === "string"
      ? new Date(body.startsAt)
      : new Date(Date.now() + 14 * 86400000);

  const capacity =
    typeof body.capacity === "number" && body.capacity >= 0
      ? Math.floor(body.capacity)
      : 25;

  if (body.isActive === true) {
    await prisma.workshopDate.updateMany({
      where: { workshopId: workshop.id, isActive: true },
      data: { isActive: false },
    });
  }

  const created = await prisma.workshopDate.create({
    data: {
      workshopId: workshop.id,
      title:
        typeof body.title === "string"
          ? body.title
          : `${workshop.label} — nueva fecha`,
      startsAt,
      venue: typeof body.venue === "string" ? body.venue : null,
      capacity,
      isActive: body.isActive !== false,
    },
  });

  if (created.isActive) {
    await syncCapacityToRedis(workshopSlug);
  }

  return NextResponse.json({ ok: true, date: created });
}
