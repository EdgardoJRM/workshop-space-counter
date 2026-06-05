"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, useState, Suspense } from "react";

function OnboardingForm() {
  const params = useSearchParams();
  const plan = params.get("plan") ?? "STARTER";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    const res = await fetch("/api/onboarding/create-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: fd.get("businessName"),
        slug: fd.get("slug"),
        ownerEmail: fd.get("ownerEmail"),
        plan,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Error al crear cuenta");
      return;
    }

    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }

    window.location.href = `/onboarding/success?org=${encodeURIComponent(data.organization.slug)}`;
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold">Crear tu cuenta</h1>
      <p className="mt-1 text-sm text-neutral-600">Plan: {plan}</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm">
          Nombre del negocio
          <input
            name="businessName"
            required
            className="mt-1 w-full rounded-lg border px-3 py-2"
            placeholder="Mi Taller en Vivo"
          />
        </label>
        <label className="block text-sm">
          URL corta (slug)
          <input
            name="slug"
            required
            pattern="[a-z0-9-]+"
            className="mt-1 w-full rounded-lg border px-3 py-2"
            placeholder="mi-taller"
          />
        </label>
        <label className="block text-sm">
          Tu email (admin)
          <input
            name="ownerEmail"
            type="email"
            required
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-black py-2.5 text-white disabled:opacity-50"
        >
          {loading ? "Creando…" : "Continuar"}
        </button>
      </form>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingForm />
    </Suspense>
  );
}
