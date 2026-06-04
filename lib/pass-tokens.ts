import { createHash, randomBytes } from "crypto";

const TOKEN_BYTES = 24;

export function generatePassToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashPassToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function getPassPublicUrl(token: string): string {
  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
  if (!base) {
    return `/pass/${token}`;
  }
  return `${base}/pass/${token}`;
}

export function getCheckinPayload(token: string): string {
  return `hp:${token}`;
}
