import { Redis } from "@upstash/redis";
import {
  WORKSHOP_SLUGS,
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
 */
export async function getSpaces(
  slug: WorkshopSlug = WORKSHOP_SLUGS.general
): Promise<SpacesSnapshot> {
  const redis = getRedis();
  const [availableRaw, updatedAt] = await Promise.all([
    redis.get<string | number | null>(workshopAvailableKey(slug)),
    redis.get<string | null>(workshopUpdatedAtKey(slug)),
  ]);

  let available = 0;
  if (availableRaw !== null && availableRaw !== undefined) {
    const parsed = Number(availableRaw);
    available = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  }

  return {
    available,
    updatedAt: typeof updatedAt === "string" ? updatedAt : null,
  };
}

/**
 * Persists spaces count and sets updatedAt to the provided ISO string.
 */
export async function setSpaces(
  available: number,
  updatedAtIso: string,
  slug: WorkshopSlug = WORKSHOP_SLUGS.general
): Promise<void> {
  const redis = getRedis();
  await redis.set(workshopAvailableKey(slug), available);
  await redis.set(workshopUpdatedAtKey(slug), updatedAtIso);
}
