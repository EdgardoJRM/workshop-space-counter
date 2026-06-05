import { NextResponse } from "next/server";
import { requireMobileAdmin } from "@/lib/mobile-auth";
import { isDatabaseConfigured } from "@/lib/prisma";
import { isWorkshopSlug, type WorkshopSlug } from "@/lib/workshop-keys";
import { parseRegistrationsCsv } from "@/lib/csv-registrations";
import { importRegistrationsFromCsv } from "@/lib/registrations";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ROWS = 500;

type Body = {
  workshop?: unknown;
  csv?: unknown;
  sendPassEmail?: unknown;
};

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const session = await requireMobileAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const workshop =
    typeof body.workshop === "string" && isWorkshopSlug(body.workshop)
      ? (body.workshop as WorkshopSlug)
      : null;
  const csv = typeof body.csv === "string" ? body.csv : "";
  const sendPassEmail = body.sendPassEmail !== false;

  if (!workshop) {
    return NextResponse.json({ error: "Invalid workshop" }, { status: 400 });
  }
  if (!csv.trim()) {
    return NextResponse.json({ error: "csv is required" }, { status: 400 });
  }

  const { rows, errors: parseErrors } = parseRegistrationsCsv(csv);
  if (parseErrors.length) {
    return NextResponse.json({ error: parseErrors.join("; ") }, { status: 400 });
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Máximo ${MAX_ROWS} filas por importación` },
      { status: 400 }
    );
  }

  const result = await importRegistrationsFromCsv(rows, workshop, {
    sendPassEmail,
    importBatchId: `mobile-${Date.now()}`,
  });

  return NextResponse.json({
    ok: true,
    created: result.created,
    duplicates: result.duplicates,
    failed: result.failed,
    parseErrors,
  });
}
