import Link from "next/link";

const PLANS = [
  {
    name: "Starter",
    price: "$49",
    tier: "STARTER",
    features: ["1 evento activo", "500 registros/mes", "Staff scanner", "Cola de impresión"],
  },
  {
    name: "Event Pro",
    price: "$99",
    tier: "EVENT_PRO",
    features: ["3 eventos activos", "2.000 registros/mes", "Emails post-evento", "Soporte prioritario"],
    highlighted: true,
  },
  {
    name: "Business",
    price: "$199",
    tier: "BUSINESS",
    features: ["Eventos ilimitados", "Staff ilimitado", "Branding personalizado", "Múltiples impresoras"],
  },
];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Hernandez Pass</h1>
      <p className="mt-2 text-neutral-600">
        Check-in, pases QR e impresión de labels para eventos en vivo.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.tier}
            className={`rounded-2xl border p-6 ${
              plan.highlighted ? "border-black shadow-lg" : "border-neutral-200"
            }`}
          >
            <h2 className="text-xl font-semibold">{plan.name}</h2>
            <p className="mt-2 text-3xl font-bold">
              {plan.price}
              <span className="text-sm font-normal text-neutral-500">/mes</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-neutral-600">
              {plan.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
            <Link
              href={`/onboarding?plan=${plan.tier}`}
              className="mt-6 block rounded-lg bg-black py-2.5 text-center text-sm font-medium text-white"
            >
              Empezar
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-12 text-center text-sm text-neutral-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="underline">
          Iniciar sesión
        </Link>
      </p>
    </main>
  );
}
