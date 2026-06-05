import { OrgRole } from "@prisma/client";
import {
  getDefaultOrganization,
  getMemberRole,
  getOrganizationById,
  orgRoleToAuthRoles,
  type OrganizationContext,
} from "@/lib/organization";
import {
  getSession,
  type AuthRole,
  type SessionPayload,
} from "@/lib/auth";

export type TenantContext = {
  organization: OrganizationContext;
  email: string | null;
  orgRole: OrgRole | null;
  authRoles: AuthRole[];
};

export async function getTenantFromSession(): Promise<TenantContext | null> {
  const session = await getSession();
  if (!session?.organizationId) {
    const org = await getDefaultOrganization();
    if (!org) return null;
    return {
      organization: org,
      email: session?.email ?? null,
      orgRole: null,
      authRoles: session?.roles ?? [],
    };
  }

  const org = await getOrganizationById(session.organizationId);
  if (!org) return null;

  let orgRole: OrgRole | null = null;
  if (session.email) {
    orgRole = await getMemberRole(org.id, session.email);
  }

  return {
    organization: org,
    email: session.email,
    orgRole,
    authRoles: session.roles,
  };
}

export async function requireTenantAdmin(): Promise<
  TenantContext | { error: string; status: number }
> {
  const tenant = await getTenantFromSession();
  if (!tenant) {
    return { error: "Organization not found", status: 404 };
  }
  if (!tenant.authRoles.includes("admin")) {
    return { error: "Unauthorized", status: 401 };
  }
  return tenant;
}

export async function requireTenantStaff(): Promise<
  TenantContext | { error: string; status: number }
> {
  const tenant = await getTenantFromSession();
  if (!tenant) {
    return { error: "Organization not found", status: 404 };
  }
  if (
    !tenant.authRoles.includes("staff") &&
    !tenant.authRoles.includes("admin")
  ) {
    return { error: "Unauthorized", status: 401 };
  }
  return tenant;
}

export function memberCanAdmin(role: OrgRole | null): boolean {
  return role === OrgRole.OWNER || role === OrgRole.ADMIN;
}

export { orgRoleToAuthRoles };
