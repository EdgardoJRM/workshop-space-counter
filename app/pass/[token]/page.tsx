import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getRegistrationByPassToken } from "@/lib/registrations";
import { getPassPublicUrl } from "@/lib/pass-tokens";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: { token: string } };

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(d);
}

export default async function PassPage({ params }: Props) {
  if (!isDatabaseConfigured()) {
    notFound();
  }

  const passRecord = await getRegistrationByPassToken(params.token);
  if (!passRecord || passRecord.revoked) {
    notFound();
  }

  const reg = passRecord.registration;
  const passUrl = getPassPublicUrl(params.token);
  const qrDataUrl = await QRCode.toDataURL(passUrl, {
    width: 320,
    margin: 2,
    color: { dark: "#222022", light: "#ffffff" },
  });

  const checkedIn = reg.checkins.length > 0;

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
          {reg.attendee.name ?? reg.attendee.email}
        </p>
        <p className="mt-1 text-center text-xs text-brand-grey">
          {reg.attendee.email}
        </p>

        <div className="mt-6 rounded-xl border border-brand-grey/20 bg-brand-off/50 p-4 text-center text-sm text-brand-charcoal">
          <p className="font-medium">{formatDate(reg.workshopDate.startsAt)}</p>
          {reg.workshopDate.venue && (
            <p className="mt-1 text-brand-grey">{reg.workshopDate.venue}</p>
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
