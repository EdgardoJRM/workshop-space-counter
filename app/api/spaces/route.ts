import { NextResponse } from "next/server";
import { applyPublicSpacesHeaders, publicSpacesHeaders } from "@/lib/cors";
import { getSpaces } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: publicSpacesHeaders });
}

export async function GET() {
  try {
    const snapshot = await getSpaces();
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
    const res = NextResponse.json(
      { error: message },
      { status: 503 }
    );
    return applyPublicSpacesHeaders(res);
  }
}
