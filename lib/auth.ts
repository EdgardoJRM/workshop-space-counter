import { timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type AuthRole = "admin" | "staff";

export type SessionPayload = {
  email: string;
  roles: AuthRole[];
};

const SESSION_COOKIE = "hp_session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 días
const MAGIC_MAX_AGE_SEC = 60 * 15; // 15 min

function getSecret(): Uint8Array | null {
  const s =
    process.env.AUTH_JWT_SECRET?.trim() ??
    process.env.STAFF_JWT_SECRET?.trim() ??
    process.env.ADMIN_TOKEN?.trim();
  if (!s) return null;
  return new TextEncoder().encode(s);
}

export function parseEmailList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

export function getRolesForEmail(email: string): AuthRole[] {
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

export function hasRole(
  session: SessionPayload,
  role: AuthRole
): boolean {
  return session.roles.includes(role);
}

export function canAccessStaff(session: SessionPayload): boolean {
  return hasRole(session, "staff") || hasRole(session, "admin");
}

export async function createMagicLinkToken(
  email: string,
  intent: AuthRole,
  nextPath: string
): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;

  return new SignJWT({
    type: "magic",
    email: email.trim().toLowerCase(),
    intent,
    next: nextPath,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAGIC_MAX_AGE_SEC}s`)
    .sign(secret);
}

export async function verifyMagicLinkToken(
  token: string
): Promise<{ email: string; intent: AuthRole; next: string } | null> {
  const secret = getSecret();
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
    if (!email) return null;
    return { email, intent, next };
  } catch {
    return null;
  }
}

export async function createSessionToken(
  email: string,
  roles: AuthRole[]
): Promise<string | null> {
  const secret = getSecret();
  if (!secret || roles.length === 0) return null;

  return new SignJWT({
    type: "session",
    email: email.trim().toLowerCase(),
    roles,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(secret);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  const secret = getSecret();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== "session") return null;
    const email = typeof payload.email === "string" ? payload.email : "";
    const rolesRaw = payload.roles;
    const roles: AuthRole[] = Array.isArray(rolesRaw)
      ? rolesRaw.filter((r): r is AuthRole => r === "admin" || r === "staff")
      : [];
    if (!email || roles.length === 0) return null;
    return { email, roles };
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

/** Compat: APIs que aceptaban ADMIN_TOKEN en body/query siguen funcionando. */
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
