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

/** Tokens en el nombre del funnel en ClickFunnels (ej. "vcanva", "vdtv"). */
export const FUNNEL_WORKSHOP_TOKENS: ReadonlyArray<{
  slug: WorkshopSlug;
  tokens: readonly string[];
}> = [
  { slug: "canva", tokens: ["vcanva", "canva"] },
  {
    slug: "duplica-ventas",
    tokens: ["vdtv", "dtv", "duplicaventas", "duplica-ventas", "duplicatusventas"],
  },
  {
    slug: "oferta-webinar",
    tokens: ["vwebinar", "ofertawebinar", "oferta-webinar"],
  },
];

function normalizeFunnelMatchText(value: string): string {
  return value.toLowerCase().replace(/[\s_\-]+/g, "");
}

/**
 * Infiere el taller desde nombres de funnel/página en CF.
 * Convención Hernandez: el funnel incluye un token como `vcanva`.
 */
export function resolveWorkshopFromFunnelText(
  ...texts: (string | null | undefined)[]
): WorkshopSlug | null {
  const normalized = texts
    .filter((t): t is string => Boolean(t?.trim()))
    .map(normalizeFunnelMatchText)
    .join("|");

  if (!normalized) return null;

  for (const { slug, tokens } of FUNNEL_WORKSHOP_TOKENS) {
    for (const token of tokens) {
      if (normalized.includes(normalizeFunnelMatchText(token))) {
        return slug;
      }
    }
  }

  return null;
}
