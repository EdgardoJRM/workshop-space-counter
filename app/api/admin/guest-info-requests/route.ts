import { NextResponse } from "next/server";
import { assertAdminApiAccess } from "@/lib/admin-api";
import { listPendingGuestInfoRequests } from "@/lib/guest-info";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const legacyToken = url.searchParams.get("token");
  const auth = await assertAdminApiAccess(legacyToken, request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const pending = await listPendingGuestInfoRequests(auth.organizationId);
  return NextResponse.json({ pending, count: pending.length });
}
