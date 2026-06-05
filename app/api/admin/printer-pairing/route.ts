import { NextResponse } from "next/server";
import { assertAdminApiAccess } from "@/lib/admin-api";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";
import { createPairingCode, revokePrinterAgent } from "@/lib/printer-pairing";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ agents: [] });
  }

  const url = new URL(request.url);
  const auth = await assertAdminApiAccess(url.searchParams.get("token"));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const agents = await prisma.printerAgent.findMany({
    where: { organizationId: auth.organizationId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ agents });
}

type PostBody = {
  token?: unknown;
  action?: unknown;
  agentId?: unknown;
};

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const legacyToken = typeof body.token === "string" ? body.token : "";
  const auth = await assertAdminApiAccess(legacyToken || null);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const action = typeof body.action === "string" ? body.action : "create";

  if (action === "revoke") {
    const agentId = typeof body.agentId === "string" ? body.agentId : "";
    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }
    await revokePrinterAgent(agentId, auth.organizationId);
    return NextResponse.json({ ok: true });
  }

  const { code, expiresAt } = await createPairingCode(auth.organizationId);
  return NextResponse.json({
    ok: true,
    code,
    expiresAt: expiresAt.toISOString(),
    expiresInMinutes: 15,
  });
}
