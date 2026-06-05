import { isAdminAuthorized } from "@/lib/auth";
import { requireTenantAdmin } from "@/lib/tenant";

export async function assertAdminApiAccess(
  legacyToken?: string | null
): Promise<
  | { ok: true; organizationId: string }
  | { ok: false; status: number; error: string }
> {
  const tenant = await requireTenantAdmin();
  if (!("error" in tenant)) {
    return { ok: true, organizationId: tenant.organization.id };
  }

  const allowed = await isAdminAuthorized(legacyToken ?? undefined);
  if (allowed) {
    const { getDefaultOrganization } = await import("@/lib/organization");
    const org = await getDefaultOrganization();
    if (org) return { ok: true, organizationId: org.id };
  }

  return { ok: false, status: 401, error: "Unauthorized" };
}
