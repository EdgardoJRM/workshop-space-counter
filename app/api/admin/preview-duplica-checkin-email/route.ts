import { NextResponse } from "next/server";
import { assertAdminApiAccess } from "@/lib/admin-api";
import { sendDuplicaVentasCheckinResourcesEmail } from "@/lib/duplica-ventas-checkin-email";

export const dynamic = "force-dynamic";

type Body = {
  token?: unknown;
  email?: unknown;
  name?: unknown;
};

export async function POST(request: Request) {
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

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : "Participante";

  const result = await sendDuplicaVentasCheckinResourcesEmail({
    to: email,
    attendeeName: name,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Send failed" }, { status: 422 });
  }

  return NextResponse.json({ ok: true, to: email });
}
