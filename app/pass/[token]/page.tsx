import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getRegistrationByPassToken } from "@/lib/registrations";
import { getPassPublicUrl } from "@/lib/pass-tokens";
import { resolveMapsLink } from "@/lib/email";
import { formatWorkshopDateTime } from "@/lib/workshop-datetime";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: { token: string } };

export default async function PassPage({ params }: Props) {
  if (!isDatabaseConfigured()) {
    notFound();
  }

  const passRecord = await getRegistrationByPassToken(params.token);
  if (!passRecord || passRecord.revoked) {
    notFound();
  }

  const reg = passRecord.registration;
  const attendeeName = reg.attendeeName ?? reg.attendee.name ?? reg.attendeeEmail ?? reg.attendee.email;
  const attendeeEmail = reg.attendeeEmail ?? reg.attendee.email;
  const passUrl = getPassPublicUrl(params.token);
  const qrDataUrl = await QRCode.toDataURL(passUrl, {
    width: 320,
    margin: 2,
    color: { dark: "#222022", light: "#ffffff" },
  });

  const checkedIn = reg.checkins.length > 0;
  const mapsLink = resolveMapsLink(
    reg.workshopDate.venue,
    reg.workshopDate.mapsUrl
  );

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="relative rounded-2xl border border-brand-grey/25 bg-white/95 p-8 shadow-brand">
        <div className="absolute left-8 top-0 h-1 w-12 rounded-b-full bg-brand-gold shadow-sm shadow-brand-gold/35" />

        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
          Hernandez Pass
        </p>
        <h1 className="mt-2 text-center text-xl font-semibold text-brand-slate">
          {reg.workshopDate.workshop.label}
        </h1>
        <p className="mt-4 text-center text-sm text-brand-charcoal">
          {attendeeName}
        </p>
        <p className="mt-1 text-center text-xs text-brand-grey">
          {attendeeEmail}
        </p>

        <div className="mt-6 rounded-xl border border-brand-grey/20 bg-brand-off/50 p-4 text-center text-sm text-brand-charcoal">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
            Fecha del evento
          </p>
          <p className="mt-1 font-medium">{formatWorkshopDateTime(reg.workshopDate.startsAt)}</p>
          {reg.workshopDate.venue && (
            <p className="mt-1 text-brand-grey">{reg.workshopDate.venue}</p>
          )}
          {mapsLink && (
            <p className="mt-3">
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-brand-blue underline"
              >
                Cómo llegar (mapa)
              </a>
            </p>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="Código QR del pase"
            width={320}
            height={320}
            className="rounded-lg border border-brand-grey/20"
          />
        </div>

        <p
          className={`mt-6 text-center text-sm font-semibold ${
            checkedIn ? "text-brand-blue" : "text-brand-charcoal"
          }`}
        >
          {checkedIn
            ? "Check-in completado"
            : "Presenta este QR el día del evento"}
        </p>
      </div>
    </div>
  );
}
