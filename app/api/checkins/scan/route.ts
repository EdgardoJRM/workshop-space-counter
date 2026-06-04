import { NextResponse } from "next/server";
import { isStaffAuthenticated } from "@/lib/staff-auth";
import { processCheckinScan } from "@/lib/checkin";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ScanBody = {
  token?: unknown;
};

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

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const result = await processCheckinScan(token, {
    checkedInBy: "staff-scanner",
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  if (!result.ok) {
    const status = result.code === "INVALID_PASS" ? 404 : 400;
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
  });
}
