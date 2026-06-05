export const WORKSHOPS = {
  "duplica-ventas": { slug: "duplica-ventas", label: "Duplica Tus Ventas" },
  canva: { slug: "canva", label: "Taller de Canva" },
  "oferta-webinar": { slug: "oferta-webinar", label: "Oferta Webinar" },
} as const;

export type WorkshopSlug = keyof typeof WORKSHOPS;

export const WORKSHOP_SLUGS: WorkshopSlug[] = [
  "duplica-ventas",
  "canva",
  "oferta-webinar",
];

export function getWorkshopLabel(slug: WorkshopSlug): string {
  return WORKSHOPS[slug].label;
}
