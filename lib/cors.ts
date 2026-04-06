import type { NextResponse } from "next/server";

/** CORS + no-cache headers for the public `/api/spaces` endpoint (external embeds, ClickFunnels). */
export const publicSpacesHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

export function applyPublicSpacesHeaders(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(publicSpacesHeaders)) {
    res.headers.set(key, value);
  }
  return res;
}
