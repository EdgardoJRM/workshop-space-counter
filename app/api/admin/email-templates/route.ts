import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { assertAdminApiAccess } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ templates: [], logs: [] });
  }

  const url = new URL(request.url);
  const legacyToken = url.searchParams.get("token");
  const auth = await assertAdminApiAccess(legacyToken);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [templates, logs] = await Promise.all([
    prisma.emailTemplate.findMany({
      orderBy: { delayHours: "asc" },
    }),
    prisma.emailLog.findMany({
      orderBy: { sentAt: "desc" },
      take: 50,
      include: {
        template: { select: { name: true } },
        registration: {
          include: {
            attendee: { select: { email: true, name: true } },
            workshopDate: {
              include: { workshop: { select: { label: true } } },
            },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      subject: t.subject,
      htmlBody: t.htmlBody,
      delayHours: t.delayHours,
      active: t.active,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    logs: logs.map((l) => ({
      id: l.id,
      templateId: l.templateId,
      templateName: l.template.name,
      registrationId: l.registrationId,
      attendeeEmail:
        l.registration.attendeeEmail ?? l.registration.attendee.email,
      attendeeName:
        l.registration.attendeeName ?? l.registration.attendee.name,
      workshopLabel: l.registration.workshopDate.workshop.label,
      sentAt: l.sentAt.toISOString(),
      status: l.status,
      error: l.error,
    })),
  });
}

type PostBody = {
  token?: unknown;
  id?: unknown;
  name?: unknown;
  subject?: unknown;
  htmlBody?: unknown;
  delayHours?: unknown;
  active?: unknown;
  action?: unknown;
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

  const id = typeof body.id === "string" ? body.id : null;
  const action = typeof body.action === "string" ? body.action : null;

  if (id && action === "toggle") {
    const existing = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    const updated = await prisma.emailTemplate.update({
      where: { id },
      data: { active: !existing.active },
    });
    return NextResponse.json({ ok: true, template: updated });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const htmlBody = typeof body.htmlBody === "string" ? body.htmlBody : "";
  const delayHours =
    typeof body.delayHours === "number" && body.delayHours >= 0
      ? Math.floor(body.delayHours)
      : null;
  const active =
    typeof body.active === "boolean" ? body.active : undefined;

  if (!name || !subject || !htmlBody || delayHours === null) {
    return NextResponse.json(
      { error: "name, subject, htmlBody and delayHours are required" },
      { status: 400 }
    );
  }

  if (id) {
    const updated = await prisma.emailTemplate.update({
      where: { id },
      data: {
        name,
        subject,
        htmlBody,
        delayHours,
        ...(active !== undefined ? { active } : {}),
      },
    });
    return NextResponse.json({ ok: true, template: updated });
  }

  const created = await prisma.emailTemplate.create({
    data: {
      name,
      subject,
      htmlBody,
      delayHours,
      active: active !== false,
    },
  });

  return NextResponse.json({ ok: true, template: created });
}
