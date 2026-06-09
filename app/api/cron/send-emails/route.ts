import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { processDueEmailTemplates } from "@/lib/email-sequence";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  return querySecret === secret;
}

export async function GET(request: Request) {
  return runSendEmails(request);
}

export async function POST(request: Request) {
  return runSendEmails(request);
}

async function runSendEmails(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  const result = await processDueEmailTemplates();

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
