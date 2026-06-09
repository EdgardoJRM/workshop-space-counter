import Link from "next/link";

const FEATURES = [
  {
    title: "Check-in con QR",
    description:
      "El staff escanea los pases en la puerta. Validación rápida con confirmación clara de éxito o error.",
  },
  {
    title: "Registros",
    description:
      "Consulta registros, entrada manual, reenvío de pases y exportación desde el admin web o la app móvil.",
  },
  {
    title: "Etiquetas / name tags",
    description:
      "Imprime y reimprime labels 3×2″ con plantillas personalizables para tu evento.",
  },
  {
    title: "Fechas y cupos",
    description:
      "Crea fechas de taller, marca la fecha en venta, duplica eventos y controla vendidos vs disponibles.",
  },
  {
    title: "ClickFunnels",
    description:
      "Conecta compras con registros automáticamente. Sincroniza cupos con tu funnel en tiempo real.",
  },
  {
    title: "Staff y admin",
    description:
      "Acceso seguro con magic link para organizadores y equipo en sitio. Panel web más app iOS.",
  },
] as const;

const WORKFLOW = [
  {
    step: "1",
    label: "Vender o registrar",
    detail: "Compras desde ClickFunnels o registro manual en admin",
  },
  { step: "2", label: "Emitir pase", detail: "Pase QR enviado por correo a cada asistente" },
  {
    step: "3",
    label: "Check-in",
    detail: "El staff escanea en la puerta desde el teléfono o la web",
  },
  {
    step: "4",
    label: "Imprimir etiquetas",
    detail: "Name tags en cola hacia tu impresora emparejada",
  },
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

      <section className="relative mx-auto max-w-5xl px-6 pb-16 pt-14 md:pt-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
            Operaciones de evento
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-brand-slate md:text-5xl">
            Hernandez Pass
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-brand-charcoal">
            Registros, pases QR, check-in, cupos y etiquetas para talleres y
            eventos en vivo — todo en un solo lugar para tu equipo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login?intent=admin&next=/admin"
              className="inline-flex items-center justify-center rounded-xl bg-brand-gold px-6 py-3 text-sm font-semibold text-brand-ink shadow-md shadow-brand-gold/25 transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
            >
              Acceso admin
            </Link>
            <Link
              href="/login?intent=staff&next=/staff/scan"
              className="inline-flex items-center justify-center rounded-xl border border-brand-grey/35 bg-white px-6 py-3 text-sm font-semibold text-brand-slate shadow-sm transition hover:bg-brand-off focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
            >
              Acceso staff
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium text-brand-blue underline-offset-4 hover:underline"
            >
              Ver planes
            </Link>
          </div>
          <p className="mt-6 text-xs text-brand-grey">
            Solo organizadores autorizados y personal del evento.
          </p>
        </div>
      </section>

      <section className="relative border-t border-brand-grey/15 bg-white/60 py-16 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-brand-slate">
            Hecho para el día del evento
          </h2>
          <p className="mt-2 max-w-xl text-sm text-brand-charcoal">
            Todo lo que tu equipo necesita antes, durante y después de que se
            llene la sala.
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

      <section className="relative py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-brand-slate">
            Cómo funciona
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

      <section className="relative border-t border-brand-grey/15 bg-brand-slate py-14 text-white">
        <div className="mx-auto max-w-5xl px-6 text-center md:text-left">
          <h2 className="text-xl font-semibold">¿Listo para tu próximo evento?</h2>
          <p className="mt-2 text-sm text-white/80">
            Entra con el correo de organizador o descarga la app iOS para el
            staff en sitio.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
            <Link
              href="/login?intent=admin"
              className="rounded-xl bg-brand-gold px-5 py-2.5 text-sm font-semibold text-brand-ink hover:brightness-95"
            >
              Comenzar
            </Link>
            <Link
              href="/support"
              className="rounded-xl border border-white/30 px-5 py-2.5 text-sm font-medium hover:bg-white/10"
            >
              Soporte
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
