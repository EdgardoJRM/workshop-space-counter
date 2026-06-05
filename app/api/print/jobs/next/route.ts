import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { isPrintAgentAuthorized } from "@/lib/print-agent-auth";
import { claimNextPrintJob } from "@/lib/print-jobs";
import type { PrintJobPayload } from "@/lib/print-jobs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  const agent = await isPrintAgentAuthorized(request);
  if (!agent) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await claimNextPrintJob(agent.organizationId);
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
