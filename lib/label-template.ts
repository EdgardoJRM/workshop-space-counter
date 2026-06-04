import { prisma } from "@/lib/prisma";
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

export async function getLabelTemplateForWorkshop(
  workshopSlug?: string | null
): Promise<LabelTemplateConfig> {
  if (workshopSlug) {
    const specific = await prisma.labelTemplate.findUnique({
      where: { workshopSlug },
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
    where: { workshopSlug: null },
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
  config: LabelTemplateConfig
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
      where: { workshopSlug: null },
    });
    if (existing) {
      return prisma.labelTemplate.update({
        where: { id: existing.id },
        data,
      });
    }
    return prisma.labelTemplate.create({
      data: { ...data, workshopSlug: null },
    });
  }

  return prisma.labelTemplate.upsert({
    where: { workshopSlug },
    create: { ...data, workshopSlug },
    update: data,
  });
}
