import { jwtVerify } from "jose";

export type AuthRole = "admin" | "staff";

export type SessionPayload = {
  email: string;
  roles: AuthRole[];
  organizationId: string;
  organizationSlug: string;
  orgRole: string;
};

/** JWT signing secret — never fall back to ADMIN_TOKEN (legacy API token). */
export function getJwtSecret(): Uint8Array | null {
  const s =
    process.env.AUTH_JWT_SECRET?.trim() ??
    process.env.STAFF_JWT_SECRET?.trim();
  if (!s) return null;
  return new TextEncoder().encode(s);
}

export function assertJwtSecretConfigured(): void {
  if (!getJwtSecret()) {
    throw new Error(
      "AUTH_JWT_SECRET (or STAFF_JWT_SECRET) must be set for session and magic-link JWTs. Do not use ADMIN_TOKEN."
    );
  }
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  const secret = getJwtSecret();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== "session") return null;
    const email = typeof payload.email === "string" ? payload.email : "";
    const rolesRaw = payload.roles;
    const roles: AuthRole[] = Array.isArray(rolesRaw)
      ? rolesRaw.filter((r): r is AuthRole => r === "admin" || r === "staff")
      : [];
    const organizationId =
      typeof payload.organizationId === "string" ? payload.organizationId : "";
    const organizationSlug =
      typeof payload.organizationSlug === "string"
        ? payload.organizationSlug
        : "";
    const orgRole =
      typeof payload.orgRole === "string" ? payload.orgRole : "STAFF";
    if (!email || roles.length === 0 || !organizationId) return null;
    return { email, roles, organizationId, organizationSlug, orgRole };
  } catch {
    return null;
  }
}

export function hasRole(session: SessionPayload, role: AuthRole): boolean {
  return session.roles.includes(role);
}

export function canAccessStaff(session: SessionPayload): boolean {
  return hasRole(session, "staff") || hasRole(session, "admin");
}
