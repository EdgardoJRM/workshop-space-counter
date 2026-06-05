import { NextResponse } from "next/server";
import {
  DEFAULT_WORKSHOP,
  isWorkshopSlug,
  type WorkshopSlug,
} from "@/lib/workshop-keys";
import { setSpaces } from "@/lib/redis";
import { applyManualAvailable } from "@/lib/capacity";
import { isDatabaseConfigured } from "@/lib/prisma";
import { assertAdminApiAccess } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

type AdminBody = {
  available?: unknown;
  token?: unknown;
  workshop?: unknown;
};

function isNonNegativeInteger(n: number): boolean {
  return Number.isInteger(n) && n >= 0;
}

function parseWorkshop(body: AdminBody): WorkshopSlug | null {
  const w = body.workshop;
  if (w === undefined || w === null) {
    return DEFAULT_WORKSHOP;
  }
  if (typeof w !== "string" || !isWorkshopSlug(w)) {
    return null;
  }
  return w;
}

export async function POST(request: Request) {
  let body: AdminBody;
  try {
    body = (await request.json()) as AdminBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const legacyToken = typeof body.token === "string" ? body.token : "";
  const auth = await assertAdminApiAccess(legacyToken || null);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const workshop = parseWorkshop(body);
  if (workshop === null) {
    return NextResponse.json(
      { error: "Invalid field `workshop`: must be a known workshop slug" },
      { status: 400 }
    );
  }

  const raw = body.available;
  if (typeof raw !== "number" || !isNonNegativeInteger(raw)) {
    return NextResponse.json(
      {
        error:
          "Invalid field `available`: must be an integer greater than or equal to 0",
      },
      { status: 400 }
    );
  }

  const updatedAt = new Date().toISOString();

  try {
    if (isDatabaseConfigured()) {
      const snap = await applyManualAvailable(
        workshop,
        raw,
        auth.organizationId
      );
      if (snap) {
        return NextResponse.json({
          ok: true,
          available: snap.available,
          updatedAt: snap.updatedAt,
          workshop,
          workshopDateId: snap.workshopDateId,
        });
      }
    }

    await setSpaces(raw, updatedAt, workshop);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to persist spaces";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    available: raw,
    updatedAt,
    workshop,
  });
}
