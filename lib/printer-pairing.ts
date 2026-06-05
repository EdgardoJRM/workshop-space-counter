import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const CODE_TTL_MS = 15 * 60 * 1000;

export function hashAgentToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function generateAgentToken(): string {
  return randomBytes(32).toString("base64url");
}

function generatePairingCode(): string {
  let code = "";
  const bytes = randomBytes(CODE_LENGTH);
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return code;
}

export async function createPairingCode(organizationId: string): Promise<{
  code: string;
  expiresAt: Date;
}> {
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  let code = generatePairingCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await prisma.printerPairingCode.create({
        data: { organizationId, code, expiresAt },
      });
      return { code, expiresAt };
    } catch {
      code = generatePairingCode();
    }
  }
  throw new Error("Could not create pairing code");
}

export async function redeemPairingCode(
  code: string,
  agentName?: string
): Promise<{ agentToken: string; organizationId: string } | null> {
  const normalized = code.trim().toUpperCase().replace(/\s/g, "");
  const row = await prisma.printerPairingCode.findUnique({
    where: { code: normalized },
  });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;

  const agentToken = generateAgentToken();
  const tokenHash = hashAgentToken(agentToken);

  await prisma.$transaction([
    prisma.printerPairingCode.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
    prisma.printerAgent.create({
      data: {
        organizationId: row.organizationId,
        name: agentName?.trim() || "Mac del evento",
        tokenHash,
      },
    }),
  ]);

  return { agentToken, organizationId: row.organizationId };
}

export type PrintAgentAuth = {
  organizationId: string;
  agentId: string | null;
};

export async function resolvePrintAgentAuth(
  request: Request
): Promise<PrintAgentAuth | null> {
  const auth = request.headers.get("authorization");
  let token = "";
  if (auth?.startsWith("Bearer ")) {
    token = auth.slice(7).trim();
  } else {
    token = request.headers.get("x-print-agent-token")?.trim() ?? "";
  }
  if (!token) return null;

  const tokenHash = hashAgentToken(token);
  const agent = await prisma.printerAgent.findFirst({
    where: { tokenHash, revokedAt: null },
  });
  if (agent) {
    await prisma.printerAgent.update({
      where: { id: agent.id },
      data: { lastSeenAt: new Date() },
    });
    return { organizationId: agent.organizationId, agentId: agent.id };
  }

  const orgs = await prisma.organization.findMany({
    where: { legacyPrintAgentToken: { not: null } },
    select: { id: true, legacyPrintAgentToken: true },
  });

  for (const org of orgs) {
    const expected = org.legacyPrintAgentToken?.trim() ?? "";
    if (!expected) continue;
    try {
      const a = Buffer.from(token, "utf8");
      const b = Buffer.from(expected, "utf8");
      if (a.length === b.length && timingSafeEqual(a, b)) {
        return { organizationId: org.id, agentId: null };
      }
    } catch {
      /* ignore */
    }
  }

  const envToken = process.env.PRINT_AGENT_TOKEN?.trim();
  if (envToken) {
    try {
      const a = Buffer.from(token, "utf8");
      const b = Buffer.from(envToken, "utf8");
      if (a.length === b.length && timingSafeEqual(a, b)) {
        const defaultOrg = await prisma.organization.findFirst({
          where: { slug: "hernandez" },
        });
        if (defaultOrg) {
          return { organizationId: defaultOrg.id, agentId: null };
        }
      }
    } catch {
      /* ignore */
    }
  }

  return null;
}

export async function revokePrinterAgent(agentId: string, organizationId: string) {
  return prisma.printerAgent.updateMany({
    where: { id: agentId, organizationId },
    data: { revokedAt: new Date() },
  });
}
