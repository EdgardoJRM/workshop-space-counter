import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { resendPassEmail } from "@/lib/registrations";
import { assertAdminApiAccess } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

type Body = {
  token?: unknown;
  registrationId?: unknown;
};

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const legacyToken = typeof body.token === "string" ? body.token : "";
  const auth = await assertAdminApiAccess(legacyToken || null, request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const registrationId =
    typeof body.registrationId === "string" ? body.registrationId : "";
  if (!registrationId) {
    return NextResponse.json(
      { error: "registrationId is required" },
      { status: 400 }
    );
  }

  const result = await resendPassEmail(registrationId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
