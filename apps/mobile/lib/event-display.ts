import type { MobileEvent } from "./types";

export type EventDisplay = {
  workshop: string;
  session: string | null;
  dateLine: string;
};

/** Short workshop name + optional session line (no duplicated date in title). */
export function getEventDisplay(
  event: MobileEvent,
  formatDate: (iso: string) => string
): EventDisplay {
  const workshop = event.workshopLabel.trim();
  let session = event.title?.trim() ?? null;

  if (session) {
    if (session === workshop) {
      session = null;
    } else {
      const stripped = session
        .replace(new RegExp(`^${escapeRegExp(workshop)}\\s*[—–\\-:]\\s*`, "i"), "")
        .trim();
      session = stripped && stripped !== workshop ? stripped : null;
    }
  }

  return {
    workshop,
    session,
    dateLine: formatDate(event.startsAt),
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
