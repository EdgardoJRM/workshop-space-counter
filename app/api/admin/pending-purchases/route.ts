import { NextResponse } from "next/server";
import { assertAdminApiAccess } from "@/lib/admin-api";
import {
  listPendingPurchases,
  resolvePendingPurchase,
} from "@/lib/pending-purchases";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const legacyToken = url.searchParams.get("token");
  const auth = await assertAdminApiAccess(legacyToken, request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const pending = await listPendingPurchases(auth.organizationId);
  return NextResponse.json({ pending, count: pending.length });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const legacyToken = url.searchParams.get("token");
  const auth = await assertAdminApiAccess(legacyToken, request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { webhookEventId?: string; workshopSlug?: string };
  try {
    body = (await request.json()) as { webhookEventId?: string; workshopSlug?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const webhookEventId = body.webhookEventId?.trim();
  const workshopSlug = body.workshopSlug?.trim();
  if (!webhookEventId || !workshopSlug) {
    return NextResponse.json(
      { error: "webhookEventId and workshopSlug are required" },
      { status: 400 }
    );
  }

  const result = await resolvePendingPurchase({
    organizationId: auth.organizationId,
    webhookEventId,
    workshopSlug,
  });

  if (!result.ok) {
    const status =
      result.code === "NOT_FOUND"
        ? 404
        : result.code === "SOLD_OUT"
          ? 409
          : 422;
    return NextResponse.json(
      { ok: false, error: result.error, code: result.code },
      { status }
    );
  }

  return NextResponse.json({
    ok: true,
    duplicate: result.duplicate,
    registrationId: result.registrationId,
    passUrl: result.passToken
      ? `${process.env.APP_BASE_URL?.replace(/\/$/, "") ?? ""}/pass/${result.passToken}`
      : undefined,
  });
}
