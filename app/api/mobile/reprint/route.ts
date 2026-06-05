import { NextResponse } from "next/server";
import { requireMobileStaff } from "@/lib/mobile-auth";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";
import { createManualReprintJob } from "@/lib/print-jobs";

export const dynamic = "force-dynamic";

type Body = {
  registrationId?: unknown;
};

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

  const registrationId =
    typeof body.registrationId === "string" ? body.registrationId.trim() : "";
  if (!registrationId) {
    return NextResponse.json(
      { error: "registrationId is required" },
      { status: 400 }
    );
  }

  const reg = await prisma.registration.findFirst({
    where: {
      id: registrationId,
      workshopDate: { workshop: { organizationId: session.organizationId } },
    },
  });
  if (!reg) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  const result = await createManualReprintJob(registrationId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ ok: true, jobId: result.jobId });
}
