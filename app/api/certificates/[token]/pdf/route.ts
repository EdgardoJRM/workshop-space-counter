import { NextResponse } from "next/server";
import {
  buildCertificatePdf,
  getCertificateByToken,
} from "@/lib/certificates";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: { token: string } };

export async function GET(_request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  const record = await getCertificateByToken(context.params.token);
  if (!record) {
    return NextResponse.json({ error: "Certificado no encontrado" }, { status: 404 });
  }

  const reg = record.registration;
  const attendeeName =
    reg.attendeeName ?? reg.attendee.name ?? reg.attendeeEmail ?? reg.attendee.email;
  const workshopTitle =
    reg.workshopDate.title?.trim() || reg.workshopDate.workshop.label;

  const pdfBytes = await buildCertificatePdf({
    attendeeName,
    workshopTitle,
    certificateDate: reg.workshopDate.startsAt,
  });

  const safeName = attendeeName.replace(/[^\w\s-]/g, "").trim() || "certificado";

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificado-${safeName}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
