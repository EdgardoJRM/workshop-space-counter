import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { assertAdminApiAccess } from "@/lib/admin-api";
import { isCertificatesEnabled, resendCertificateEmail } from "@/lib/certificates";

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

  if (!isCertificatesEnabled()) {
    return NextResponse.json(
      { error: "El envío de certificados está desactivado", code: "DISABLED" },
      { status: 503 }
    );
  }

  const registrationId =
    typeof body.registrationId === "string" ? body.registrationId : "";
  if (!registrationId) {
    return NextResponse.json(
      { error: "registrationId is required" },
      { status: 400 }
    );
  }

  const reg = await prisma.registration.findFirst({
    where: {
      id: registrationId,
      workshopDate: {
        workshop: { organizationId: auth.organizationId },
      },
    },
  });

  if (!reg) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  const result = await resendCertificateEmail(registrationId);
  if (!result.ok) {
    const status = result.code === "NOT_ELIGIBLE" ? 422 : 500;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  return NextResponse.json({ ok: true });
}
