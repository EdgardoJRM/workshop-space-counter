/**
 * Redis key prefixes for workshop seat counts.
 * To add more workshops, introduce new slugs and use the same pattern.
 */
export const WORKSHOP_SLUGS = {
  general: "general",
} as const;

export type WorkshopSlug = (typeof WORKSHOP_SLUGS)[keyof typeof WORKSHOP_SLUGS];

export function workshopAvailableKey(slug: WorkshopSlug = WORKSHOP_SLUGS.general): string {
  return `workshop:${slug}:available`;
}

export function workshopUpdatedAtKey(slug: WorkshopSlug = WORKSHOP_SLUGS.general): string {
  return `workshop:${slug}:updatedAt`;
}
