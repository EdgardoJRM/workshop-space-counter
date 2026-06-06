import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

type Body = {
  expoPushToken?: unknown;
  platform?: unknown;
};

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const expoPushToken =
    typeof body.expoPushToken === "string" ? body.expoPushToken.trim() : "";
  if (!expoPushToken.startsWith("ExponentPushToken[")) {
    return NextResponse.json({ error: "Invalid expo push token" }, { status: 400 });
  }

  const platform = typeof body.platform === "string" ? body.platform : null;

  const email = session.email.trim().toLowerCase();

  await prisma.mobilePushToken.upsert({
    where: { expoPushToken },
    create: {
      organizationId: session.organizationId,
      email,
      expoPushToken,
      platform,
    },
    update: {
      organizationId: session.organizationId,
      email,
      platform,
    },
  });

  return NextResponse.json({ ok: true });
}
