import { Redis } from "@upstash/redis";
import {
  DEFAULT_WORKSHOP,
  WORKSHOPS,
  type WorkshopSlug,
  workshopAvailableKey,
  workshopUpdatedAtKey,
} from "./workshop-keys";

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Missing Upstash Redis configuration. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
    );
  }
  return new Redis({ url, token });
}

export type SpacesSnapshot = {
  available: number;
  updatedAt: string | null;
};

/**
 * Reads current spaces count and last update timestamp for the given workshop.
 * If the primary Redis key is missing and the workshop defines `legacySlug`, reads the legacy keys (migración desde `workshop:general:*`).
 */
export async function getSpaces(
  slug: WorkshopSlug = DEFAULT_WORKSHOP
): Promise<SpacesSnapshot> {
  const redis = getRedis();
  const meta = WORKSHOPS[slug];

  const [primaryAvail, primaryUpdated] = await Promise.all([
    redis.get<string | number | null>(workshopAvailableKey(slug)),
    redis.get<string | null>(workshopUpdatedAtKey(slug)),
  ]);

  let availableRaw: string | number | null =
    primaryAvail === undefined ? null : primaryAvail;
  let updatedAt: string | null =
    typeof primaryUpdated === "string" ? primaryUpdated : null;

  const primaryAvailableMissing =
    primaryAvail === null || primaryAvail === undefined;

  if (primaryAvailableMissing && "legacySlug" in meta && meta.legacySlug) {
    const legacySlug = meta.legacySlug;
    const [legacyAvail, legacyUpdated] = await Promise.all([
      redis.get<string | number | null>(workshopAvailableKey(legacySlug)),
      redis.get<string | null>(workshopUpdatedAtKey(legacySlug)),
    ]);
    if (legacyAvail !== null && legacyAvail !== undefined) {
      availableRaw = legacyAvail;
    }
    if (updatedAt === null && typeof legacyUpdated === "string") {
      updatedAt = legacyUpdated;
    }
  }

  let available = 0;
  if (availableRaw !== null && availableRaw !== undefined) {
    const parsed = Number(availableRaw);
    available = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  }

  return {
    available,
    updatedAt,
  };
}

/**
 * Persists spaces count and sets updatedAt to the provided ISO string (solo keys del slug actual, nunca el legacy).
 */
export async function setSpaces(
  available: number,
  updatedAtIso: string,
  slug: WorkshopSlug = DEFAULT_WORKSHOP
): Promise<void> {
  const redis = getRedis();
  await redis.set(workshopAvailableKey(slug), available);
  await redis.set(workshopUpdatedAtKey(slug), updatedAtIso);
}
