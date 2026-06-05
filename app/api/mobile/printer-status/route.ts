import { NextResponse } from "next/server";
import { getPrinterStatusForOrg } from "@/lib/mobile-api";
import { requireMobileStaff } from "@/lib/mobile-auth";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

  const status = await getPrinterStatusForOrg(session.organizationId);
  return NextResponse.json(status);
}
