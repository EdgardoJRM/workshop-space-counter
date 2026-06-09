import Link from "next/link";

export const metadata = {
  title: "Soporte | Hernandez Pass",
  description: "Soporte para Hernandez Pass.",
};

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
        Hernandez Pass
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-brand-slate">
        Soporte
      </h1>
      <p className="mt-4 leading-7 text-brand-charcoal">
        Hernandez Pass ayuda a equipos de eventos a administrar registros, pases
        QR, check-in y etiquetas de asistencia.
      </p>

      <div className="mt-10 rounded-2xl border border-brand-grey/25 bg-white p-6 shadow-brand">
        <h2 className="text-lg font-semibold text-brand-slate">Contacto</h2>
        <p className="mt-2 text-brand-charcoal">
          Para ayuda con acceso, eventos, registros o impresión de etiquetas,
          escribe a{" "}
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
        <h2 className="text-lg font-semibold text-brand-slate">Acceso a la app</h2>
        <p className="mt-2 leading-7 text-brand-charcoal">
          La app requiere una cuenta autorizada del organizador. Si eres parte
          del equipo de un evento, usa el enlace mágico enviado a tu correo.
        </p>
      </div>

      <div className="mt-8 text-sm text-brand-charcoal">
        <Link href="/privacy" className="font-semibold text-brand-blue underline">
          Ver política de privacidad
        </Link>
      </div>
    </div>
  );
}
