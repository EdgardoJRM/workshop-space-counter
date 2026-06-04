import { NextResponse } from "next/server";
import { assertAdminApiAccess } from "@/lib/admin-api";
import {
  DEFAULT_LABEL_TEMPLATE,
  getLabelTemplateForWorkshop,
  upsertLabelTemplate,
} from "@/lib/label-template";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";
import { isWorkshopSlug, type WorkshopSlug } from "@/lib/workshop-keys";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ template: DEFAULT_LABEL_TEMPLATE });
  }

  const url = new URL(request.url);
  const legacyToken = url.searchParams.get("token");
  const auth = await assertAdminApiAccess(legacyToken);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const w = url.searchParams.get("w");
  const slug = w && isWorkshopSlug(w) ? w : null;

  const template = await getLabelTemplateForWorkshop(slug);
  const row = slug
    ? await prisma.labelTemplate.findUnique({ where: { workshopSlug: slug } })
    : await prisma.labelTemplate.findFirst({ where: { workshopSlug: null } });

  return NextResponse.json({
    template,
    workshopSlug: slug,
    hasCustomTemplate: Boolean(row),
  });
}

type PostBody = {
  token?: unknown;
  workshop?: unknown;
  fontLarge?: unknown;
  fontSmall?: unknown;
  mediaSize?: unknown;
  showEmail?: unknown;
  showWorkshop?: unknown;
};

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const legacyToken = typeof body.token === "string" ? body.token : "";
  const auth = await assertAdminApiAccess(legacyToken || null);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const workshopSlug =
    typeof body.workshop === "string" && isWorkshopSlug(body.workshop)
      ? body.workshop
      : null;

  const fontLarge =
    typeof body.fontLarge === "number" && body.fontLarge >= 40
      ? Math.floor(body.fontLarge)
      : DEFAULT_LABEL_TEMPLATE.fontLarge;
  const fontSmall =
    typeof body.fontSmall === "number" && body.fontSmall >= 20
      ? Math.floor(body.fontSmall)
      : DEFAULT_LABEL_TEMPLATE.fontSmall;
  const mediaSize =
    typeof body.mediaSize === "string" && body.mediaSize.trim()
      ? body.mediaSize.trim()
      : DEFAULT_LABEL_TEMPLATE.mediaSize;

  await upsertLabelTemplate(workshopSlug as WorkshopSlug | null, {
    fontLarge,
    fontSmall,
    mediaSize,
    showEmail: body.showEmail === true,
    showWorkshop: body.showWorkshop === true,
  });

  return NextResponse.json({ ok: true });
}
