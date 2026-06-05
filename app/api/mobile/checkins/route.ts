import { NextResponse } from "next/server";
import {
  processCheckinByRegistrationId,
  processCheckinScan,
} from "@/lib/checkin";
import { requireMobileStaff } from "@/lib/mobile-auth";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Body = {
  token?: unknown;
  registrationId?: unknown;
  workshopDateId?: unknown;
};

function jsonFromResult(result: Awaited<ReturnType<typeof processCheckinScan>>) {
  if (!result.ok) {
    const status =
      result.code === "INVALID_PASS" || result.code === "NOT_FOUND"
        ? 404
        : 400;
    return NextResponse.json(
      { ok: false, error: result.error, code: result.code },
      { status }
    );
  }

  return NextResponse.json({
    ok: true,
    status: result.status,
    attendeeName: result.attendeeName,
    workshopLabel: result.workshopLabel,
    checkedInAt: result.checkedInAt,
    printJobQueued: result.printJobQueued ?? false,
    printJobId: result.printJobId,
    printError: result.printError,
  });
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  const session = await requireMobileStaff(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const workshopDateId =
    typeof body.workshopDateId === "string" ? body.workshopDateId.trim() : "";
  const meta = {
    checkedInBy: session.email,
    userAgent: request.headers.get("user-agent") ?? "hernandez-pass-mobile",
    expectedWorkshopDateId: workshopDateId || undefined,
  };

  const registrationId =
    typeof body.registrationId === "string" ? body.registrationId.trim() : "";

  if (registrationId) {
    if (!workshopDateId) {
      return NextResponse.json(
        { error: "workshopDateId is required with registrationId" },
        { status: 400 }
      );
    }
    const result = await processCheckinByRegistrationId(
      registrationId,
      workshopDateId,
      meta
    );
    return jsonFromResult(result);
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json(
      { error: "token or registrationId is required" },
      { status: 400 }
    );
  }

  const result = await processCheckinScan(token, meta);
  return jsonFromResult(result);
}
