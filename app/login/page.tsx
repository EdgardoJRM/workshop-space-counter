"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
type AuthRole = "admin" | "staff";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intentParam = searchParams.get("intent");
  const intent: AuthRole = intentParam === "staff" ? "staff" : "admin";
  const next =
    searchParams.get("next") ??
    (intent === "staff" ? "/staff/scan" : "/admin");
  const errorCode = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const errorMessages: Record<string, string> = {
    missing_token: "Falta el enlace de acceso.",
    invalid_token: "El enlace expiró o no es válido. Solicita uno nuevo.",
    not_authorized: "Tu correo no tiene acceso a esta área.",
    server: "Error del servidor. Intenta de nuevo.",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setSent(false);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, intent, next }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo enviar el enlace");
        return;
      }
      setSent(true);
      router.refresh();
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-brand-grey/25 bg-white/95 p-8 shadow-brand">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
          Hernandez Pass
        </p>
        <h1 className="mt-2 text-center text-xl font-semibold text-brand-slate">
          {intent === "staff" ? "Acceso Staff" : "Acceso Admin"}
        </h1>
        <p className="mt-2 text-center text-sm text-brand-charcoal">
          Te enviaremos un enlace mágico a tu correo (válido 15 min).
        </p>

        <div className="mt-4 flex justify-center gap-2">
          <Link
            href={`/login?intent=admin&next=/admin`}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              intent === "admin"
                ? "bg-brand-slate text-white"
                : "bg-brand-off text-brand-charcoal"
            }`}
          >
            Admin
          </Link>
          <Link
            href={`/login?intent=staff&next=/staff/scan`}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              intent === "staff"
                ? "bg-brand-slate text-white"
                : "bg-brand-off text-brand-charcoal"
            }`}
          >
            Staff
          </Link>
        </div>

        {errorCode && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
            {errorMessages[errorCode] ?? "No se pudo iniciar sesión."}
          </p>
        )}

        {sent ? (
          <p className="mt-6 text-center text-sm text-brand-blue" role="status">
            Revisa tu bandeja de entrada. Si no lo ves, revisa spam.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-brand-charcoal"
              >
                Correo autorizado
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border-brand-grey/35"
                disabled={loading}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded-xl bg-brand-gold py-3 text-sm font-semibold text-brand-ink disabled:opacity-60"
            >
              {loading ? "Enviando…" : "Enviar enlace mágico"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm">Cargando…</p>}>
      <LoginForm />
    </Suspense>
  );
}
