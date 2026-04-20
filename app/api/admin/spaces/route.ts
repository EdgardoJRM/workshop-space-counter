import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import {
  DEFAULT_WORKSHOP,
  isWorkshopSlug,
  type WorkshopSlug,
} from "@/lib/workshop-keys";
import { setSpaces } from "@/lib/redis";

export const dynamic = "force-dynamic";

type AdminBody = {
  available?: unknown;
  token?: unknown;
  workshop?: unknown;
};

function isNonNegativeInteger(n: number): boolean {
  return Number.isInteger(n) && n >= 0;
}

function safeEqualToken(provided: string, expected: string): boolean {
  try {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
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
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || adminToken.length === 0) {
    return NextResponse.json(
      { error: "Server misconfiguration: ADMIN_TOKEN is not set" },
      { status: 500 }
    );
  }

  let body: AdminBody;
  try {
    body = (await request.json()) as AdminBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  if (!safeEqualToken(token, adminToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
