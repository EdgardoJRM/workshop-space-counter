import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { redeemPairingCode } from "@/lib/printer-pairing";

export const dynamic = "force-dynamic";

type Body = {
  code?: unknown;
  name?: unknown;
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

  const code = typeof body.code === "string" ? body.code : "";
  if (!code.trim()) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name : undefined;
  const result = await redeemPairingCode(code, name);
  if (!result) {
    return NextResponse.json(
      { error: "Invalid or expired pairing code" },
      { status: 400 }
    );
  }

  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");

  return NextResponse.json({
    ok: true,
    agentToken: result.agentToken,
    organizationId: result.organizationId,
    appBaseUrl: base || null,
  });
}
