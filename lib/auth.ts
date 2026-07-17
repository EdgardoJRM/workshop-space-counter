import { timingSafeEqual } from "crypto";
import { OrgRole } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import {
  ensureDefaultOrganization,
  getMemberRole,
  getOrganizationBySlug,
  getOrganizationsForEmail,
  orgRoleToAuthRoles,
} from "@/lib/organization";
import {
  assertJwtSecretConfigured,
  getJwtSecret,
} from "@/lib/session-token";

export type AuthRole = "admin" | "staff";

export type SessionPayload = {
  email: string;
  roles: AuthRole[];
  organizationId: string;
  organizationSlug: string;
  orgRole: OrgRole;
};

const SESSION_COOKIE = "hp_session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;
const MAGIC_MAX_AGE_SEC = 60 * 15;

export { assertJwtSecretConfigured };

export function parseEmailList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

export async function resolveAuthForEmailInOrg(
  email: string,
  organizationSlug: string
): Promise<{
  organizationId: string;
  organizationSlug: string;
  orgRole: OrgRole;
  roles: AuthRole[];
} | null> {
  const normalized = email.trim().toLowerCase();
  const slug = organizationSlug.trim().toLowerCase();
  const memberships = await getOrganizationsForEmail(normalized);
  const match = memberships.find((m) => m.slug === slug);
  if (match) {
    return {
      organizationId: match.id,
      organizationSlug: match.slug,
      orgRole: match.role,
      roles: orgRoleToAuthRoles(match.role),
    };
  }

  const org = await getOrganizationBySlug(slug);
  if (!org) return null;

  const roles = getLegacyRolesForEmail(normalized);
  if (roles.length === 0) return null;

  const defaultOrg = await ensureDefaultOrganization();
  if (org.id !== defaultOrg.id) return null;

  const orgRole =
    (await getMemberRole(org.id, normalized)) ??
    (roles.includes("admin") ? OrgRole.ADMIN : OrgRole.STAFF);

  return {
    organizationId: org.id,
    organizationSlug: org.slug,
    orgRole,
    roles,
  };
}

export async function resolveAuthForEmail(email: string): Promise<{
  organizationId: string;
  organizationSlug: string;
  orgRole: OrgRole;
  roles: AuthRole[];
} | null> {
  const normalized = email.trim().toLowerCase();
  const memberships = await getOrganizationsForEmail(normalized);

  if (memberships.length > 0) {
    const primary = memberships[0]!;
    return {
      organizationId: primary.id,
      organizationSlug: primary.slug,
      orgRole: primary.role,
      roles: orgRoleToAuthRoles(primary.role),
    };
  }

  const roles = getLegacyRolesForEmail(normalized);
  if (roles.length === 0) return null;

  const org = await ensureDefaultOrganization();
  const orgRole =
    (await getMemberRole(org.id, normalized)) ??
    (roles.includes("admin") ? OrgRole.ADMIN : OrgRole.STAFF);

  return {
    organizationId: org.id,
    organizationSlug: org.slug,
    orgRole,
    roles,
  };
}

function getLegacyRolesForEmail(email: string): AuthRole[] {
  const normalized = email.trim().toLowerCase();
  const roles: AuthRole[] = [];
  const adminEmails = parseEmailList(process.env.ADMIN_EMAILS);
  const staffEmails = parseEmailList(process.env.STAFF_EMAILS);
  const legacyAllowed = parseEmailList(process.env.AUTH_ALLOWED_EMAILS);

  if (adminEmails.includes(normalized)) roles.push("admin");
  if (staffEmails.includes(normalized)) roles.push("staff");
  if (roles.length === 0 && legacyAllowed.includes(normalized)) {
    roles.push("admin", "staff");
  }
  return Array.from(new Set(roles));
}

/** @deprecated use resolveAuthForEmail */
export function getRolesForEmail(email: string): AuthRole[] {
  return getLegacyRolesForEmail(email);
}

export function hasRole(session: SessionPayload, role: AuthRole): boolean {
  return session.roles.includes(role);
}

export function canAccessStaff(session: SessionPayload): boolean {
  return hasRole(session, "staff") || hasRole(session, "admin");
}

export async function createMagicLinkToken(
  email: string,
  intent: AuthRole,
  nextPath: string,
  organizationSlug?: string
): Promise<string | null> {
  const secret = getJwtSecret();
  if (!secret) return null;

  return new SignJWT({
    type: "magic",
    email: email.trim().toLowerCase(),
    intent,
    next: nextPath,
    organizationSlug: organizationSlug ?? undefined,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAGIC_MAX_AGE_SEC}s`)
    .sign(secret);
}

export async function verifyMagicLinkToken(token: string): Promise<{
  email: string;
  intent: AuthRole;
  next: string;
  organizationSlug?: string;
} | null> {
  const secret = getJwtSecret();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== "magic") return null;
    const email = typeof payload.email === "string" ? payload.email : "";
    const intent = payload.intent === "staff" ? "staff" : "admin";
    const next =
      typeof payload.next === "string" && payload.next.startsWith("/")
        ? payload.next
        : intent === "staff"
          ? "/staff/scan"
          : "/admin";
    const organizationSlug =
      typeof payload.organizationSlug === "string"
        ? payload.organizationSlug
        : undefined;
    if (!email) return null;
    return { email, intent, next, organizationSlug };
  } catch {
    return null;
  }
}

export async function createSessionToken(
  payload: SessionPayload
): Promise<string | null> {
  const secret = getJwtSecret();
  if (!secret || payload.roles.length === 0) return null;

  return new SignJWT({
    type: "session",
    email: payload.email.trim().toLowerCase(),
    roles: payload.roles,
    organizationId: payload.organizationId,
    organizationSlug: payload.organizationSlug,
    orgRole: payload.orgRole,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(secret);
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
      payload.orgRole === OrgRole.OWNER ||
      payload.orgRole === OrgRole.ADMIN ||
      payload.orgRole === OrgRole.STAFF
        ? payload.orgRole
        : OrgRole.STAFF;

    if (!email || roles.length === 0) return null;

    if (!organizationId) {
      const resolved = await resolveAuthForEmail(email);
      if (!resolved) return null;
      return {
        email,
        roles,
        organizationId: resolved.organizationId,
        organizationSlug: resolved.organizationSlug,
        orgRole: resolved.orgRole,
      };
    }

    return {
      email,
      roles,
      organizationId,
      organizationSlug,
      orgRole,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireAdminSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || !hasRole(session, "admin")) return null;
  return session;
}

export async function requireStaffSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || !canAccessStaff(session)) return null;
  return session;
}

export function verifyLegacyAdminToken(token: string): boolean {
  const expected = process.env.ADMIN_TOKEN?.trim();
  if (!expected || !token) return false;
  try {
    const a = Buffer.from(token, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function isAdminAuthorized(
  legacyToken?: string | null
): Promise<boolean> {
  const session = await requireAdminSession();
  if (session) return true;
  if (legacyToken && verifyLegacyAdminToken(legacyToken)) return true;
  return false;
}
