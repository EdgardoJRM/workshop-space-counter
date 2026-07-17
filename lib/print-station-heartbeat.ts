import { prisma } from "@/lib/prisma";

/** Marks the Chrome print station as alive for staff session polls. */
export async function stampPrintStationHeartbeat(organizationId: string): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: { printStationLastSeenAt: new Date() },
  });
}

export const PRINT_STATION_ONLINE_MS = 2 * 60 * 1000;

export function isPrintStationOnline(lastSeenAt: Date | null | undefined): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - lastSeenAt.getTime() < PRINT_STATION_ONLINE_MS;
}
