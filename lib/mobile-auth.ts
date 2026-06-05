import {
  canAccessStaff,
  getSession,
  hasRole,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/auth";

export async function getSessionFromRequest(
  request: Request
): Promise<SessionPayload | null> {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (token) {
      const session = await verifySessionToken(token);
      if (session) return session;
    }
  }

  return getSession();
}

export async function requireMobileStaff(
  request: Request
): Promise<SessionPayload | null> {
  const session = await getSessionFromRequest(request);
  if (!session || !canAccessStaff(session)) return null;
  return session;
}

export async function requireMobileAdmin(
  request: Request
): Promise<SessionPayload | null> {
  const session = await getSessionFromRequest(request);
  if (!session || !hasRole(session, "admin")) return null;
  return session;
}
