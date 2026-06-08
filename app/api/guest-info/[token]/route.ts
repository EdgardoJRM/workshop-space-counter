import { NextResponse } from "next/server";
import {
  completeGuestInfoRequest,
  getGuestInfoRequestByToken,
  type GuestSubmitInput,
} from "@/lib/guest-info";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: { token: string } };

export async function GET(_request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const view = await getGuestInfoRequestByToken(context.params.token);
  if (!view) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(view);
}

export async function POST(request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const guests = (body as { guests?: GuestSubmitInput[] }).guests;
  if (!Array.isArray(guests)) {
    return NextResponse.json({ error: "guests array required" }, { status: 400 });
  }

  const result = await completeGuestInfoRequest(context.params.token, guests);

  if (!result.ok) {
    const status =
      result.code === "NOT_FOUND"
        ? 404
        : result.code === "SOLD_OUT"
          ? 409
          : result.code === "EXPIRED"
            ? 410
            : 422;
    return NextResponse.json(
      { ok: false, error: result.error, code: result.code },
      { status }
    );
  }

  return NextResponse.json({
    ok: true,
    created: result.created,
    duplicates: result.duplicates,
  });
}
