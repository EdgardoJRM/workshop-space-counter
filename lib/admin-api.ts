import { hasRole, isAdminAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/mobile-auth";
import { requireTenantAdmin } from "@/lib/tenant";

let legacyTokenWarned = false;

export async function assertAdminApiAccess(
  legacyToken?: string | null,
  request?: Request
): Promise<
  | { ok: true; organizationId: string }
  | { ok: false; status: number; error: string }
> {
  if (request) {
    const session = await getSessionFromRequest(request);
    if (session && hasRole(session, "admin")) {
      return { ok: true, organizationId: session.organizationId };
    }
  }

  const tenant = await requireTenantAdmin();
  if (!("error" in tenant)) {
    return { ok: true, organizationId: tenant.organization.id };
  }

  if (legacyToken?.trim()) {
    if (!legacyTokenWarned) {
      legacyTokenWarned = true;
      console.warn(
        "[admin-api] Legacy ?token= admin auth is deprecated; use /login session."
      );
    }
  }

  const allowed = await isAdminAuthorized(legacyToken ?? undefined);
  if (allowed) {
    const { getDefaultOrganization } = await import("@/lib/organization");
    const org = await getDefaultOrganization();
    if (org) return { ok: true, organizationId: org.id };
  }

  return { ok: false, status: 401, error: "Unauthorized" };
}
