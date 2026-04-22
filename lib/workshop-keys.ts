/**
 * Catálogo de talleres y keys Redis: `workshop:<slug>:available` / `workshop:<slug>:updatedAt`
 */
export const WORKSHOPS = {
  "duplica-ventas": {
    slug: "duplica-ventas",
    label: "Duplica Tus Ventas",
    /** Si la key nueva no existe, se lee `workshop:general:*` (migración desde el despliegue inicial). */
    legacySlug: "general" as const,
  },
  canva: {
    slug: "canva",
    label: "Taller de Canva",
  },
  "oferta-webinar": {
    slug: "oferta-webinar",
    label: "Oferta Webinar",
  },
} as const;

export type WorkshopSlug = keyof typeof WORKSHOPS;

export const DEFAULT_WORKSHOP: WorkshopSlug = "duplica-ventas";

export function workshopAvailableKey(slug: string): string {
  return `workshop:${slug}:available`;
}

export function workshopUpdatedAtKey(slug: string): string {
  return `workshop:${slug}:updatedAt`;
}

export function isWorkshopSlug(value: string): value is WorkshopSlug {
  return Object.prototype.hasOwnProperty.call(WORKSHOPS, value);
}

export function getWorkshopLabel(slug: WorkshopSlug): string {
  return WORKSHOPS[slug].label;
}
