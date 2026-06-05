import { prisma } from "@/lib/prisma";
import { getDefaultOrganization } from "@/lib/organization";
import type { WorkshopSlug } from "@/lib/workshop-keys";

export type LabelTemplateConfig = {
  fontLarge: number;
  fontSmall: number;
  mediaSize: string;
  showEmail: boolean;
  showWorkshop: boolean;
};

export const DEFAULT_LABEL_TEMPLATE: LabelTemplateConfig = {
  fontLarge: 160,
  fontSmall: 80,
  mediaSize: "3x2",
  showEmail: false,
  showWorkshop: false,
};

function isMissingTableError(error: unknown): boolean {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: string }).code)
      : "";
  return code === "P2021" || code === "42P01";
}

export async function getLabelTemplateForWorkshop(
  workshopSlug?: string | null,
  organizationId?: string
): Promise<LabelTemplateConfig> {
  try {
    return await loadLabelTemplateForWorkshop(workshopSlug, organizationId);
  } catch (error) {
    if (isMissingTableError(error)) {
      return DEFAULT_LABEL_TEMPLATE;
    }
    throw error;
  }
}

async function loadLabelTemplateForWorkshop(
  workshopSlug?: string | null,
  organizationId?: string
): Promise<LabelTemplateConfig> {
  const orgId =
    organizationId ?? (await getDefaultOrganization())?.id ?? null;
  if (!orgId) return DEFAULT_LABEL_TEMPLATE;

  if (workshopSlug) {
    const specific = await prisma.labelTemplate.findUnique({
      where: {
        organizationId_workshopSlug: {
          organizationId: orgId,
          workshopSlug,
        },
      },
    });
    if (specific) {
      return {
        fontLarge: specific.fontLarge,
        fontSmall: specific.fontSmall,
        mediaSize: specific.mediaSize,
        showEmail: specific.showEmail,
        showWorkshop: specific.showWorkshop,
      };
    }
  }

  const global = await prisma.labelTemplate.findFirst({
    where: { organizationId: orgId, workshopSlug: null },
  });
  if (global) {
    return {
      fontLarge: global.fontLarge,
      fontSmall: global.fontSmall,
      mediaSize: global.mediaSize,
      showEmail: global.showEmail,
      showWorkshop: global.showWorkshop,
    };
  }

  return DEFAULT_LABEL_TEMPLATE;
}

export async function upsertLabelTemplate(
  workshopSlug: WorkshopSlug | null,
  config: LabelTemplateConfig,
  organizationId: string
) {
  const data = {
    fontLarge: config.fontLarge,
    fontSmall: config.fontSmall,
    mediaSize: config.mediaSize,
    showEmail: config.showEmail,
    showWorkshop: config.showWorkshop,
  };

  if (workshopSlug === null) {
    const existing = await prisma.labelTemplate.findFirst({
      where: { organizationId, workshopSlug: null },
    });
    if (existing) {
      return prisma.labelTemplate.update({
        where: { id: existing.id },
        data,
      });
    }
    return prisma.labelTemplate.create({
      data: { organizationId, workshopSlug: null, ...data },
    });
  }

  return prisma.labelTemplate.upsert({
    where: {
      organizationId_workshopSlug: {
        organizationId,
        workshopSlug,
      },
    },
    create: {
      organizationId,
      workshopSlug,
      ...data,
    },
    update: data,
  });
}
