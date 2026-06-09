import { createHash, randomBytes } from "crypto";

const TOKEN_BYTES = 24;

export function generateCertificateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashCertificateToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function getCertificatePublicUrl(token: string): string {
  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
  if (!base) {
    return `/certificates/${token}`;
  }
  return `${base}/certificates/${token}`;
}

export function getCertificatePdfUrl(token: string): string {
  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
  if (!base) {
    return `/api/certificates/${token}/pdf`;
  }
  return `${base}/api/certificates/${token}/pdf`;
}
