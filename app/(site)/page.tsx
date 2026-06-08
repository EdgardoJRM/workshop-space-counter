import Link from "next/link";

const FEATURES = [
  {
    title: "QR check-in",
    description:
      "Staff scan attendee passes at the door. Fast validation with clear success and error feedback.",
  },
  {
    title: "Registrations",
    description:
      "View registrations, manual entry, resend passes, and export data from web or mobile admin.",
  },
  {
    title: "Name tags",
    description:
      "Print and reprint 3×2″ labels with customizable templates for your event roll.",
  },
  {
    title: "Dates & capacity",
    description:
      "Create workshop dates, mark selling dates, duplicate events, and track sold vs available seats.",
  },
  {
    title: "ClickFunnels",
    description:
      "Connect purchases to registrations automatically. Sync capacity with your funnel in real time.",
  },
  {
    title: "Staff & admin",
    description:
      "Secure magic-link access for organizers and on-site staff. Web dashboard plus iOS app.",
  },
] as const;

const WORKFLOW = [
  { step: "1", label: "Sell or register", detail: "Purchases from ClickFunnels or manual admin entry" },
  { step: "2", label: "Issue pass", detail: "QR pass emailed to each attendee" },
  { step: "3", label: "Check in", detail: "Staff scans at the door on phone or web" },
  { step: "4", label: "Print labels", detail: "Name tags queued to your paired printer" },
] as const;

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #3f5e78 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Hero */}
      <section className="relative mx-auto max-w-5xl px-6 pb-16 pt-14 md:pt-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
            Event operations
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-brand-slate md:text-5xl">
            Hernandez Pass
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-brand-charcoal">
            Registrations, QR passes, check-in, capacity, and name tags for live
            workshops and events — in one place for your team.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login?intent=admin&next=/admin"
              className="inline-flex items-center justify-center rounded-xl bg-brand-gold px-6 py-3 text-sm font-semibold text-brand-ink shadow-md shadow-brand-gold/25 transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
            >
              Admin login
            </Link>
            <Link
              href="/login?intent=staff&next=/staff/scan"
              className="inline-flex items-center justify-center rounded-xl border border-brand-grey/35 bg-white px-6 py-3 text-sm font-semibold text-brand-slate shadow-sm transition hover:bg-brand-off focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
            >
              Staff login
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium text-brand-blue underline-offset-4 hover:underline"
            >
              View plans
            </Link>
          </div>
          <p className="mt-6 text-xs text-brand-grey">
            Authorized organizers and event staff only.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="relative border-t border-brand-grey/15 bg-white/60 py-16 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-brand-slate">
            Built for event day
          </h2>
          <p className="mt-2 max-w-xl text-sm text-brand-charcoal">
            Everything your team needs before, during, and after the room fills up.
          </p>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="rounded-2xl border border-brand-grey/20 bg-white p-6 shadow-sm"
              >
                <h3 className="font-semibold text-brand-slate">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-charcoal">
                  {f.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Workflow */}
      <section className="relative py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-brand-slate">
            How it works
          </h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW.map((w) => (
              <li key={w.step} className="relative">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gold text-sm font-bold text-brand-ink shadow-sm">
                  {w.step}
                </span>
                <h3 className="mt-4 font-semibold text-brand-slate">{w.label}</h3>
                <p className="mt-1 text-sm text-brand-charcoal">{w.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative border-t border-brand-grey/15 bg-brand-slate py-14 text-white">
        <div className="mx-auto max-w-5xl px-6 text-center md:text-left">
          <h2 className="text-xl font-semibold">Ready for your next event?</h2>
          <p className="mt-2 text-sm text-white/80">
            Sign in with your organizer email or download the iOS app for on-site staff.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
            <Link
              href="/login?intent=admin"
              className="rounded-xl bg-brand-gold px-5 py-2.5 text-sm font-semibold text-brand-ink hover:brightness-95"
            >
              Get started
            </Link>
            <Link
              href="/support"
              className="rounded-xl border border-white/30 px-5 py-2.5 text-sm font-medium hover:bg-white/10"
            >
              Support
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
