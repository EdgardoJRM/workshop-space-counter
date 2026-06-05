import { NextResponse } from "next/server";
import { requireMobileAdmin } from "@/lib/mobile-auth";
import {
  getOrganizationBrandingById,
  mapOrganizationBranding,
} from "@/lib/organization-branding";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const session = await requireMobileAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branding = await getOrganizationBrandingById(session.organizationId);
  return NextResponse.json({ organization: branding });
}

type PatchBody = {
  displayName?: unknown;
  appTitle?: unknown;
  logoUrl?: unknown;
  primaryColor?: unknown;
  accentColor?: unknown;
  supportEmail?: unknown;
};

export async function PATCH(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const session = await requireMobileAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, string | null> = {};
  if (typeof body.displayName === "string") data.displayName = body.displayName.trim();
  if (typeof body.appTitle === "string") data.appTitle = body.appTitle.trim();
  if (typeof body.logoUrl === "string") data.logoUrl = body.logoUrl.trim() || null;
  if (typeof body.primaryColor === "string") data.primaryColor = body.primaryColor.trim();
  if (typeof body.accentColor === "string") data.accentColor = body.accentColor.trim();
  if (typeof body.supportEmail === "string") {
    data.supportEmail = body.supportEmail.trim() || null;
  }

  const updated = await prisma.organization.update({
    where: { id: session.organizationId },
    data,
  });

  return NextResponse.json({
    ok: true,
    organization: mapOrganizationBranding(updated),
  });
}
