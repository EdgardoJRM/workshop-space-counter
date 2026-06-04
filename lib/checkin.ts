import { prisma } from "@/lib/prisma";
import { hashPassToken } from "@/lib/pass-tokens";

export type CheckinResult =
  | {
      ok: true;
      status: "checked_in" | "already_checked_in";
      attendeeName: string;
      workshopLabel: string;
      checkedInAt: string;
    }
  | { ok: false; error: string; code: string };

export async function processCheckinScan(
  token: string,
  meta: { checkedInBy?: string; userAgent?: string }
): Promise<CheckinResult> {
  const normalized = token.startsWith("hp:") ? token.slice(3) : token;
  const tokenHash = hashPassToken(normalized);

  const pass = await prisma.pass.findUnique({
    where: { tokenHash },
    include: {
      registration: {
        include: {
          attendee: true,
          workshopDate: { include: { workshop: true } },
          checkins: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!pass || pass.revoked) {
    return { ok: false, error: "Pase no válido", code: "INVALID_PASS" };
  }

  const reg = pass.registration;
  if (reg.status !== "CONFIRMED") {
    return { ok: false, error: "Registro no confirmado", code: "NOT_CONFIRMED" };
  }

  const existing = reg.checkins[0];
  if (existing) {
    return {
      ok: true,
      status: "already_checked_in",
      attendeeName: reg.attendee.name ?? reg.attendee.email,
      workshopLabel: reg.workshopDate.workshop.label,
      checkedInAt: existing.createdAt.toISOString(),
    };
  }

  const checkin = await prisma.$transaction(async (tx) => {
    const created = await tx.checkin.create({
      data: {
        registrationId: reg.id,
        checkedInBy: meta.checkedInBy ?? "staff",
        userAgent: meta.userAgent ?? null,
      },
    });

    await tx.workshopDate.update({
      where: { id: reg.workshopDateId },
      data: { checkedInCount: { increment: 1 } },
    });

    return created;
  });

  return {
    ok: true,
    status: "checked_in",
    attendeeName: reg.attendee.name ?? reg.attendee.email,
    workshopLabel: reg.workshopDate.workshop.label,
    checkedInAt: checkin.createdAt.toISOString(),
  };
}
