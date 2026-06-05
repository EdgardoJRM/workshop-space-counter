import { prisma } from "@/lib/prisma";

export type OrganizationBranding = {
  id: string;
  slug: string;
  name: string;
  displayName: string;
  appTitle: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  supportEmail: string | null;
  customDomain: string | null;
};

const DEFAULT_PRIMARY = "#1a1a1a";
const DEFAULT_ACCENT = "#c9a227";

export function mapOrganizationBranding(org: {
  id: string;
  slug: string;
  name: string;
  displayName: string | null;
  appTitle: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  supportEmail: string | null;
  customDomain: string | null;
}): OrganizationBranding {
  return {
    id: org.id,
    slug: org.slug,
    name: org.name,
    displayName: org.displayName?.trim() || org.name,
    appTitle: org.appTitle?.trim() || org.displayName?.trim() || org.name,
    logoUrl: org.logoUrl,
    primaryColor: org.primaryColor?.trim() || DEFAULT_PRIMARY,
    accentColor: org.accentColor?.trim() || DEFAULT_ACCENT,
    supportEmail: org.supportEmail,
    customDomain: org.customDomain,
  };
}

export async function getOrganizationBrandingBySlug(
  slug: string
): Promise<OrganizationBranding | null> {
  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) return null;
  return mapOrganizationBranding(org);
}

export async function getOrganizationBrandingById(
  id: string
): Promise<OrganizationBranding | null> {
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) return null;
  return mapOrganizationBranding(org);
}
