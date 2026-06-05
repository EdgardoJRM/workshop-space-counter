import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { isPrintAgentAuthorized } from "@/lib/print-agent-auth";
import { completePrintJobWithRetry } from "@/lib/print-jobs";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

type CompleteBody = {
  success?: unknown;
  error?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  const agent = await isPrintAgentAuthorized(request);
  if (!agent) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CompleteBody;
  try {
    body = (await request.json()) as CompleteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const success = body.success === true;
  const errorMessage =
    typeof body.error === "string" ? body.error : undefined;

  const updated = await completePrintJobWithRetry(
    context.params.id,
    success,
    errorMessage
  );

  if (!updated) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    status: updated.status,
    printedAt: updated.printedAt?.toISOString() ?? null,
    error: updated.error,
  });
}
