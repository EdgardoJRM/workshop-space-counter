import { prisma } from "@/lib/prisma";

const HEARTBEAT_INTERVAL_MS = 30_000;
const lastHeartbeatByOrg = new Map<string, number>();

/** Marks the Chrome print station as alive for staff session polls. */
export async function stampPrintStationHeartbeat(organizationId: string): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: { printStationLastSeenAt: new Date() },
  });
}

/** Throttled heartbeat for high-frequency print-station polls. */
export async function stampPrintStationHeartbeatThrottled(
  organizationId: string
): Promise<void> {
  const now = Date.now();
  const last = lastHeartbeatByOrg.get(organizationId) ?? 0;
  if (now - last < HEARTBEAT_INTERVAL_MS) return;
  lastHeartbeatByOrg.set(organizationId, now);
  await stampPrintStationHeartbeat(organizationId);
}

export const PRINT_STATION_ONLINE_MS = 2 * 60 * 1000;

export function isPrintStationOnline(lastSeenAt: Date | null | undefined): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - lastSeenAt.getTime() < PRINT_STATION_ONLINE_MS;
}
