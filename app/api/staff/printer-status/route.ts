import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { getPrinterStatusForOrg } from "@/lib/mobile-api";
import { isDatabaseConfigured } from "@/lib/prisma";

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

  const status = await getPrinterStatusForOrg(session.organizationId);
  return NextResponse.json(status);
}
