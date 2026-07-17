import { PrintJobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatSessionOptionLabel } from "@/lib/staff-scan-sessions";
import { getStaffScanSessions } from "@/lib/staff-scan-sessions";
import { isPrintStationOnline } from "@/lib/print-station-heartbeat";

const AGENT_ONLINE_MS = 2 * 60 * 1000;

export async function getPrinterStatusForOrg(organizationId: string) {
  const [pending, processing, printedToday, agents, org] = await Promise.all([
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
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { printStationLastSeenAt: true },
    }),
  ]);

  const agentLastSeen = agents
    .map((a) => a.lastSeenAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const macAgentConnected =
    agentLastSeen !== undefined &&
    Date.now() - agentLastSeen.getTime() < AGENT_ONLINE_MS;

  const webStationConnected = isPrintStationOnline(org?.printStationLastSeenAt);

  const webLastSeen = org?.printStationLastSeenAt ?? null;
  const lastPollAt =
    webLastSeen && agentLastSeen
      ? webLastSeen > agentLastSeen
        ? webLastSeen
        : agentLastSeen
      : webLastSeen ?? agentLastSeen ?? null;

  const mode: "web" | "mac" | "both" | null =
    webStationConnected && macAgentConnected
      ? "both"
      : webStationConnected
        ? "web"
        : macAgentConnected
          ? "mac"
          : null;

  return {
    connected: webStationConnected || macAgentConnected,
    webStationConnected,
    macAgentConnected,
    mode,
    pending,
    processing,
    printedLast24h: printedToday,
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      lastSeenAt: a.lastSeenAt?.toISOString() ?? null,
    })),
    lastPollAt: lastPollAt?.toISOString() ?? null,
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
