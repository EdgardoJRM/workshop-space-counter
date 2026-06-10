import { NextResponse } from "next/server";
import { OrgRole } from "@prisma/client";
import { createSessionToken } from "@/lib/auth";
import {
  isAppReviewDemoEnabled,
  verifyAppReviewDemoCredentials,
} from "@/lib/app-review-demo";
import { getDefaultOrganization } from "@/lib/organization";
import { getOrganizationBrandingById } from "@/lib/organization-branding";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Body = {
  email?: unknown;
  password?: unknown;
};

export async function GET() {
  return NextResponse.json({ enabled: isAppReviewDemoEnabled() });
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  if (!isAppReviewDemoEnabled()) {
    return NextResponse.json({ error: "Demo login is not available" }, { status: 404 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !email.includes("@") || !password) {
    return NextResponse.json(
      { error: "email and password are required" },
      { status: 400 }
    );
  }

  if (!verifyAppReviewDemoCredentials(email, password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const org = await getDefaultOrganization();
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const accessToken = await createSessionToken({
    email,
    roles: ["admin", "staff"],
    organizationId: org.id,
    organizationSlug: org.slug,
    orgRole: OrgRole.ADMIN,
  });

  if (!accessToken) {
    return NextResponse.json({ error: "Could not create session" }, { status: 500 });
  }

  const branding = await getOrganizationBrandingById(org.id);

  return NextResponse.json({
    ok: true,
    accessToken,
    email,
    roles: ["admin", "staff"],
    orgRole: OrgRole.ADMIN,
    organization: branding,
  });
}
