import Link from "next/link";
import { notFound } from "next/navigation";
import { getCertificateByToken } from "@/lib/certificates";
import { getCertificatePdfUrl } from "@/lib/certificate-tokens";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: { token: string } };

export default async function CertificatePage({ params }: Props) {
  if (!isDatabaseConfigured()) {
    notFound();
  }

  const record = await getCertificateByToken(params.token);
  if (!record) {
    notFound();
  }

  const { view } = record;
  const pdfUrl = getCertificatePdfUrl(params.token);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 pb-10 pt-6">
      <div className="relative rounded-2xl border border-brand-grey/15 bg-white p-8 shadow-lg shadow-brand-slate/10">
        <div className="absolute left-8 top-0 h-1 w-12 rounded-b-full bg-brand-gold shadow-sm shadow-brand-gold/35" />

        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-brand-blue">
          Certificado de participación
        </p>
        <h1 className="mt-3 text-center text-xl font-semibold text-brand-slate">
          {view.workshopTitle}
        </h1>

        <div className="mt-6 rounded-xl border border-brand-grey/20 bg-brand-off/50 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
            Participante
          </p>
          <p className="mt-2 text-lg font-semibold text-brand-ink">{view.attendeeName}</p>
          <p className="mt-1 text-sm text-brand-grey">{view.attendeeEmail}</p>
        </div>

        <div className="mt-4 rounded-xl border border-brand-grey/20 bg-white p-4 text-center text-sm text-brand-charcoal">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
            Fecha del taller
          </p>
          <p className="mt-1 font-medium">{view.eventDateLabel}</p>
          <p className="mt-3 text-xs text-brand-grey">
            Fecha en certificado: {view.certificateDateLabel}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-brand-gold px-5 py-3 text-sm font-bold text-brand-ink shadow-sm transition hover:brightness-95"
          >
            Descargar certificado
          </a>
          <Link
            href="/"
            className="text-center text-sm font-semibold text-brand-blue underline"
          >
            Volver al inicio
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-brand-grey">
          Certificado emitido por Hernandez Pass
        </p>
      </div>
    </div>
  );
}
