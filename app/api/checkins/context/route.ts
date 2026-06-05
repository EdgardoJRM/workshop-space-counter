import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/prisma";
import {
  formatSessionOptionLabel,
  getStaffScanSessions,
} from "@/lib/staff-scan-sessions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  const session = await requireStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { todayKey, sessions } = await getStaffScanSessions(
    session.organizationId
  );

  return NextResponse.json({
    todayKey,
    usingToday: sessions.some((s) => s.isToday),
    sessions: sessions.map((s) => ({
      ...s,
      label: formatSessionOptionLabel(s),
    })),
  });
}
