import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/mobile-auth";
import { canAccessStaff } from "@/lib/auth";
import { claimNextPrintJob, type PrintJobPayload } from "@/lib/print-jobs";
import { stampPrintStationHeartbeat } from "@/lib/print-station-heartbeat";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

  const job = await claimNextPrintJob(session.organizationId);
  if (!job) {
    return NextResponse.json({ job: null });
  }

  return NextResponse.json({
    job: {
      id: job.id,
      registrationId: job.registrationId,
      trigger: job.trigger,
      payload: job.payload as PrintJobPayload,
      attempts: job.attempts,
    },
  });
}
