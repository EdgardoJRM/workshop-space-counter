import { NextResponse } from "next/server";
import { isStaffAuthenticated } from "@/lib/staff-auth";
import {
  processCheckinByRegistrationId,
  processCheckinScan,
} from "@/lib/checkin";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ScanBody = {
  token?: unknown;
  registrationId?: unknown;
  workshopDateId?: unknown;
};

function checkinJsonResponse(result: Awaited<ReturnType<typeof processCheckinScan>>) {
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
  });
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  const staffOk = await isStaffAuthenticated();
  if (!staffOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ScanBody;
  try {
    body = (await request.json()) as ScanBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const workshopDateIdFromBody =
    typeof body.workshopDateId === "string" ? body.workshopDateId.trim() : "";

  const meta = {
    checkedInBy: "staff-scanner",
    userAgent: request.headers.get("user-agent") ?? undefined,
    expectedWorkshopDateId: workshopDateIdFromBody || undefined,
  };

  const registrationId =
    typeof body.registrationId === "string" ? body.registrationId.trim() : "";
  const workshopDateId = workshopDateIdFromBody;

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
    return checkinJsonResponse(result);
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json(
      { error: "token or registrationId is required" },
      { status: 400 }
    );
  }

  const result = await processCheckinScan(token, meta);
  return checkinJsonResponse(result);
}
