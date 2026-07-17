import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/mobile-auth";
import { canAccessStaff } from "@/lib/auth";
import { createTestPrintJob } from "@/lib/print-jobs";
import { stampPrintStationHeartbeat } from "@/lib/print-station-heartbeat";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  const session = await getSessionFromRequest(request);
  if (!session || !canAccessStaff(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await stampPrintStationHeartbeat(session.organizationId);

  const result = await createTestPrintJob(session.organizationId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    jobId: result.jobId,
    payload: result.payload,
  });
}
