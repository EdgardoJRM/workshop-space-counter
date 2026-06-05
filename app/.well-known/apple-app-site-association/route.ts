import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Universal Links iOS → abre la app desde enlaces en pass.edgardohernandez.com */
export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  if (!teamId) {
    return new NextResponse("{}", {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appID: `${teamId}.com.hernandezmedia.pass`,
          paths: ["/api/mobile/auth/exchange", "/api/mobile/auth/exchange/*"],
        },
      ],
    },
  };

  return NextResponse.json(body, {
    headers: { "Content-Type": "application/json" },
  });
}
