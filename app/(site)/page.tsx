import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #3f5e78 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="absolute -left-3 top-0 h-16 w-1 rounded-full bg-brand-gold shadow-sm shadow-brand-gold/40" />
        <div className="rounded-2xl border border-brand-grey/25 bg-white/95 p-8 shadow-brand backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
            Taller
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-slate">
            Workshop Space Counter
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-brand-charcoal">
            API pública en{" "}
            <code className="rounded-md border border-brand-grey/35 bg-brand-off px-2 py-0.5 font-mono text-xs text-brand-slate">
              /api/spaces
            </code>
            . Actualiza el contador desde el panel seguro.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-xl bg-brand-gold px-6 py-3 text-sm font-semibold text-brand-ink shadow-md shadow-brand-gold/25 transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
            >
              Ir a administración
            </Link>
            <span className="text-center text-xs text-brand-grey sm:text-left">
              Solo personal autorizado
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
