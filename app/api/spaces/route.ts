import { type NextRequest, NextResponse } from "next/server";
import { applyPublicSpacesHeaders, publicSpacesHeaders } from "@/lib/cors";
import {
  DEFAULT_WORKSHOP,
  isWorkshopSlug,
} from "@/lib/workshop-keys";
import { getSpaces } from "@/lib/redis";
import { getCapacitySnapshot, syncCapacityToRedis } from "@/lib/capacity";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: publicSpacesHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get("w");
    const slug = raw === null || raw === "" ? DEFAULT_WORKSHOP : raw;
    if (!isWorkshopSlug(slug)) {
      const res = NextResponse.json(
        { error: "Invalid workshop slug" },
        { status: 400 }
      );
      return applyPublicSpacesHeaders(res);
    }

    if (isDatabaseConfigured()) {
      const fromDb = await getCapacitySnapshot(slug);
      if (fromDb) {
        await syncCapacityToRedis(slug);
        const res = NextResponse.json(
          {
            available: fromDb.available,
            updatedAt: fromDb.updatedAt,
          },
          { status: 200 }
        );
        return applyPublicSpacesHeaders(res);
      }
    }

    const snapshot = await getSpaces(slug);
    const res = NextResponse.json(
      {
        available: snapshot.available,
        updatedAt: snapshot.updatedAt,
      },
      { status: 200 }
    );
    return applyPublicSpacesHeaders(res);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to read spaces from storage";
    const res = NextResponse.json({ error: message }, { status: 503 });
    return applyPublicSpacesHeaders(res);
  }
}
