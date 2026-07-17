import { prisma } from "@/lib/prisma";
import { WORKSHOP_TIMEZONE, formatWorkshopDateTime } from "@/lib/workshop-datetime";

export type StaffScanSession = {
  workshopDateId: string;
  workshopSlug: string;
  workshopLabel: string;
  title: string | null;
  startsAt: string;
  isToday: boolean;
  isActive: boolean;
  registrationCount: number;
  checkedInCount: number;
};

export function getWorkshopCalendarDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: WORKSHOP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function getStaffScanSessions(
  organizationId: string
): Promise<{
  todayKey: string;
  sessions: StaffScanSession[];
}> {
  const todayKey = getWorkshopCalendarDay(new Date());

  const dates = await prisma.workshopDate.findMany({
    where: { workshop: { organizationId } },
    include: {
      workshop: true,
      _count: { select: { registrations: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  const mapped: StaffScanSession[] = dates.map((d) => ({
    workshopDateId: d.id,
    workshopSlug: d.workshop.slug,
    workshopLabel: d.workshop.label,
    title: d.title,
    startsAt: d.startsAt.toISOString(),
    isToday: getWorkshopCalendarDay(d.startsAt) === todayKey,
    isActive: d.isActive,
    registrationCount: d._count.registrations,
    checkedInCount: d.checkedInCount,
  }));

  const sessions = mapped
    .filter((s) => s.isToday || s.isActive)
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );

  return { todayKey, sessions };
}

export function formatSessionOptionLabel(session: StaffScanSession): string {
  const when = formatWorkshopDateTime(new Date(session.startsAt));
  const title = session.title?.trim();
  if (title) return `${session.workshopLabel} — ${title} (${when})`;
  return `${session.workshopLabel} — ${when}`;
}
