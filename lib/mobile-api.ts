import { PrintJobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatSessionOptionLabel } from "@/lib/staff-scan-sessions";
import { getStaffScanSessions } from "@/lib/staff-scan-sessions";

export async function getPrinterStatusForOrg(organizationId: string) {
  const [pending, processing, printedToday, agents] = await Promise.all([
    prisma.printJob.count({
      where: { organizationId, status: PrintJobStatus.PENDING },
    }),
    prisma.printJob.count({
      where: { organizationId, status: PrintJobStatus.PROCESSING },
    }),
    prisma.printJob.count({
      where: {
        organizationId,
        status: PrintJobStatus.PRINTED,
        printedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.printerAgent.findMany({
      where: { organizationId, revokedAt: null },
      orderBy: { lastSeenAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        lastSeenAt: true,
        createdAt: true,
      },
    }),
  ]);

  const lastSeen = agents
    .map((a) => a.lastSeenAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const connected =
    lastSeen !== undefined &&
    Date.now() - lastSeen.getTime() < 2 * 60 * 1000;

  return {
    connected,
    pending,
    processing,
    printedLast24h: printedToday,
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      lastSeenAt: a.lastSeenAt?.toISOString() ?? null,
    })),
    lastPollAt: lastSeen?.toISOString() ?? null,
  };
}

export async function getMobileEvents(organizationId: string) {
  const { todayKey, sessions } = await getStaffScanSessions(organizationId);
  return {
    todayKey,
    events: sessions.map((s) => ({
      ...s,
      label: formatSessionOptionLabel(s),
    })),
  };
}
