import { NextResponse } from "next/server";
import { getOrganizationBrandingBySlug } from "@/lib/organization-branding";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: { slug: string } };

export async function GET(_request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  const branding = await getOrganizationBrandingBySlug(
    context.params.slug.trim().toLowerCase()
  );
  if (!branding) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  return NextResponse.json({ organization: branding });
}
