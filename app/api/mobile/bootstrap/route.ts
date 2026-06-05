import { NextResponse } from "next/server";
import { canAccessStaff, hasRole } from "@/lib/auth";
import { getOrganizationBrandingById } from "@/lib/organization-branding";
import { getSessionFromRequest } from "@/lib/mobile-auth";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const branding = await getOrganizationBrandingById(session.organizationId);

  return NextResponse.json({
    authenticated: true,
    email: session.email,
    roles: session.roles,
    orgRole: session.orgRole,
    permissions: {
      staff: canAccessStaff(session),
      admin: hasRole(session, "admin"),
    },
    organization: branding,
  });
}
