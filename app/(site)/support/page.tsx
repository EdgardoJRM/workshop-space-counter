import Link from "next/link";

export const metadata = {
  title: "Support | Hernandez Pass",
  description: "Support for Hernandez Pass.",
};

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
        Hernandez Pass
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-brand-slate">
        Support
      </h1>
      <p className="mt-4 leading-7 text-brand-charcoal">
        Hernandez Pass helps event teams manage registrations, QR passes,
        check-in, and attendee name tags.
      </p>

      <div className="mt-10 rounded-2xl border border-brand-grey/25 bg-white p-6 shadow-brand">
        <h2 className="text-lg font-semibold text-brand-slate">Contact</h2>
        <p className="mt-2 text-brand-charcoal">
          For help with access, events, registrations, or name tag printing,
          email{" "}
          <a
            className="font-semibold text-brand-blue underline"
            href="mailto:soporte@edgardohernandez.com"
          >
            soporte@edgardohernandez.com
          </a>
          .
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-brand-grey/25 bg-brand-off p-6">
        <h2 className="text-lg font-semibold text-brand-slate">App Access</h2>
        <p className="mt-2 leading-7 text-brand-charcoal">
          The app requires an authorized organizer account. If you are part of
          an event team, use the magic link sent to your email address.
        </p>
      </div>

      <div className="mt-8 text-sm text-brand-charcoal">
        <Link href="/privacy" className="font-semibold text-brand-blue underline">
          View Privacy Policy
        </Link>
      </div>
    </div>
  );
}
