import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { assertAdminApiAccess } from "@/lib/admin-api";
import { isWorkshopSlug, type WorkshopSlug } from "@/lib/workshop-keys";
import { parseRegistrationsCsv } from "@/lib/csv-registrations";
import { importRegistrationsFromCsv } from "@/lib/registrations";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ROWS = 500;

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const legacyToken = url.searchParams.get("token");
  const auth = await assertAdminApiAccess(legacyToken, request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Se esperaba multipart/form-data" }, {
      status: 400,
    });
  }

  const workshopRaw = formData.get("workshop");
  const workshop =
    typeof workshopRaw === "string" && isWorkshopSlug(workshopRaw)
      ? (workshopRaw as WorkshopSlug)
      : null;

  if (!workshop) {
    return NextResponse.json({ error: "Taller inválido (workshop)" }, {
      status: 400,
    });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo CSV requerido (file)" }, {
      status: 400,
    });
  }

  const sendPassEmail = formData.get("sendPassEmail") !== "false";
  const text = await file.text();

  const { rows, errors: parseErrors } = parseRegistrationsCsv(text);

  if (rows.length === 0 && parseErrors.length > 0) {
    return NextResponse.json(
      { ok: false, parseErrors, created: 0, duplicates: 0, failed: 0 },
      { status: 400 }
    );
  }

  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      {
        error: `Máximo ${MAX_ROWS} filas por importación. Tu archivo tiene ${rows.length}.`,
      },
      { status: 400 }
    );
  }

  const importResult = await importRegistrationsFromCsv(rows, workshop, {
    sendPassEmail,
    importBatchId: `admin-${Date.now()}`,
  });

  return NextResponse.json({
    ok: true,
    parseErrors,
    ...importResult,
  });
}
