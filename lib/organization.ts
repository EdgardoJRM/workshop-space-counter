import { OrgRole, PlanTier } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { parseEmailList } from "@/lib/auth";

export const DEFAULT_ORG_SLUG = "hernandez";

export type OrganizationContext = {
  id: string;
  slug: string;
  name: string;
  plan: PlanTier;
};

export async function getOrganizationBySlug(
  slug: string
): Promise<OrganizationContext | null> {
  if (!isDatabaseConfigured()) return null;
  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) return null;
  return { id: org.id, slug: org.slug, name: org.name, plan: org.plan };
}

export async function getOrganizationById(
  id: string
): Promise<OrganizationContext | null> {
  if (!isDatabaseConfigured()) return null;
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) return null;
  return { id: org.id, slug: org.slug, name: org.name, plan: org.plan };
}

export async function getDefaultOrganization(): Promise<OrganizationContext | null> {
  const bySlug = await getOrganizationBySlug(DEFAULT_ORG_SLUG);
  if (bySlug) return bySlug;
  if (!isDatabaseConfigured()) return null;
  const first = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!first) return null;
  return { id: first.id, slug: first.slug, name: first.name, plan: first.plan };
}

export type WebhookSecretSource = "org" | "env";

export type WebhookSecretResolution = {
  secret: string | null;
  secretSource: WebhookSecretSource | null;
};

/**
 * Resolves the webhook secret for an organization.
 * When Vercel env and DB differ, env wins and DB is synced (fixes rotation drift).
 */
export async function resolveWebhookSecretForOrganization(
  organizationId: string
): Promise<WebhookSecretResolution> {
  if (!isDatabaseConfigured()) {
    const envOnly = process.env.CLICKFUNNELS_WEBHOOK_SECRET?.trim() || null;
    return envOnly
      ? { secret: envOnly, secretSource: "env" }
      : { secret: null, secretSource: null };
  }

  const envSecret = process.env.CLICKFUNNELS_WEBHOOK_SECRET?.trim() || null;
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { clickfunnelsSecret: true },
  });
  const dbSecret = org?.clickfunnelsSecret?.trim() || null;

  if (envSecret && dbSecret && envSecret !== dbSecret) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { clickfunnelsSecret: envSecret },
    });
    return { secret: envSecret, secretSource: "env" };
  }

  if (dbSecret) return { secret: dbSecret, secretSource: "org" };
  if (envSecret) return { secret: envSecret, secretSource: "env" };
  return { secret: null, secretSource: null };
}

export async function resolveOrganizationForWebhook(
  request: Request
): Promise<OrganizationContext | null> {
  const url = new URL(request.url);
  const slug =
    url.searchParams.get("org")?.trim() ||
    request.headers.get("x-organization-slug")?.trim() ||
    DEFAULT_ORG_SLUG;

  const org = await getOrganizationBySlug(slug);
  if (org) return org;
  return getDefaultOrganization();
}

export async function getMemberRole(
  organizationId: string,
  email: string
): Promise<OrgRole | null> {
  if (!isDatabaseConfigured()) return null;
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_email: {
        organizationId,
        email: email.trim().toLowerCase(),
      },
    },
  });
  return member?.role ?? null;
}

export function orgRoleToAuthRoles(role: OrgRole): ("admin" | "staff")[] {
  if (role === OrgRole.OWNER || role === OrgRole.ADMIN) return ["admin", "staff"];
  return ["staff"];
}

export async function getOrganizationsForEmail(
  email: string
): Promise<Array<OrganizationContext & { role: OrgRole }>> {
  if (!isDatabaseConfigured()) return [];
  const normalized = email.trim().toLowerCase();
  const members = await prisma.organizationMember.findMany({
    where: { email: normalized },
    include: { organization: true },
  });
  return members.map((m) => ({
    id: m.organization.id,
    slug: m.organization.slug,
    name: m.organization.name,
    plan: m.organization.plan,
    role: m.role,
  }));
}

/** Sincroniza miembros desde ADMIN_EMAILS / STAFF_EMAILS al org por defecto. */
export async function ensureLegacyMembers(defaultOrgId: string): Promise<void> {
  const adminEmails = parseEmailList(process.env.ADMIN_EMAILS);
  const staffEmails = parseEmailList(process.env.STAFF_EMAILS);

  for (const email of adminEmails) {
    await prisma.organizationMember.upsert({
      where: {
        organizationId_email: { organizationId: defaultOrgId, email },
      },
      create: {
        organizationId: defaultOrgId,
        email,
        role: OrgRole.ADMIN,
      },
      update: { role: OrgRole.ADMIN },
    });
  }

  for (const email of staffEmails) {
    if (adminEmails.includes(email)) continue;
    await prisma.organizationMember.upsert({
      where: {
        organizationId_email: { organizationId: defaultOrgId, email },
      },
      create: {
        organizationId: defaultOrgId,
        email,
        role: OrgRole.STAFF,
      },
      update: {},
    });
  }
}

export async function ensureDefaultOrganization(): Promise<OrganizationContext> {
  if (!isDatabaseConfigured()) {
    throw new Error("Database not configured");
  }

  let org = await prisma.organization.findUnique({
    where: { slug: DEFAULT_ORG_SLUG },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        slug: DEFAULT_ORG_SLUG,
        name: "Hernandez Media",
        plan: PlanTier.BUSINESS,
        legacyPrintAgentToken: process.env.PRINT_AGENT_TOKEN?.trim() || null,
        clickfunnelsSecret: process.env.CLICKFUNNELS_WEBHOOK_SECRET?.trim() || null,
      },
    });
  } else {
    const updates: {
      legacyPrintAgentToken?: string | null;
      clickfunnelsSecret?: string | null;
    } = {};
    const envToken = process.env.PRINT_AGENT_TOKEN?.trim();
    if (envToken && !org.legacyPrintAgentToken) {
      updates.legacyPrintAgentToken = envToken;
    }
    const envWebhook = process.env.CLICKFUNNELS_WEBHOOK_SECRET?.trim();
    const dbWebhook = org.clickfunnelsSecret?.trim();
    if (envWebhook && envWebhook !== dbWebhook) {
      updates.clickfunnelsSecret = envWebhook;
    }
    if (Object.keys(updates).length > 0) {
      org = await prisma.organization.update({
        where: { id: org.id },
        data: updates,
      });
    }
  }

  await ensureLegacyMembers(org.id);

  return {
    id: org.id,
    slug: org.slug,
    name: org.name,
    plan: org.plan,
  };
}

export async function createOrganization(input: {
  slug: string;
  name: string;
  ownerEmail: string;
  plan?: PlanTier;
}): Promise<OrganizationContext> {
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const name = input.name.trim();
  const org = await prisma.organization.create({
    data: {
      slug,
      name,
      displayName: name,
      appTitle: `${name} Pass`,
      plan: input.plan ?? PlanTier.STARTER,
      members: {
        create: {
          email: input.ownerEmail.trim().toLowerCase(),
          role: OrgRole.OWNER,
        },
      },
    },
  });
  return { id: org.id, slug: org.slug, name: org.name, plan: org.plan };
}
