"use client";

import { useCallback, useEffect, useState } from "react";
import { getWorkshopLabel, type WorkshopSlug } from "@/lib/workshop-keys";

type SpacesResponse = {
  available: number;
  updatedAt: string | null;
};

type FeedbackKind = "idle" | "success" | "error";

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return "Sin registro previo";
  try {
    return new Intl.DateTimeFormat("es", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export type SpacesFormProps = {
  slug: WorkshopSlug;
};

export function SpacesForm({ slug }: SpacesFormProps) {
  const title = getWorkshopLabel(slug);
  const idPrefix = slug.replace(/[^a-z0-9-]/gi, "-");

  const [preview, setPreview] = useState<SpacesResponse | null>(null);
  const [availableInput, setAvailableInput] = useState<string>("");
  const [token, setToken] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackKind>("idle");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  const fetchCurrent = useCallback(async () => {
    setLoadError(null);
    try {
      const params = new URLSearchParams({ w: slug });
      const res = await fetch(`/api/spaces?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      const data = (await res.json()) as SpacesResponse;
      setPreview(data);
      setAvailableInput(String(data.available));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "No se pudo cargar el valor");
    }
  }, [slug]);

  useEffect(() => {
    void fetchCurrent();
  }, [fetchCurrent]);

  const availableNum = Number.parseInt(availableInput, 10);
  const isValidAvailable =
    availableInput.trim() !== "" &&
    Number.isInteger(availableNum) &&
    availableNum >= 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setClientError(null);
    setFeedback("idle");
    setFeedbackMessage(null);

    if (!isValidAvailable) {
      setClientError("Indica un número entero mayor o igual a 0.");
      return;
    }
    if (!token.trim()) {
      setClientError("Introduce el token de administración.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          available: availableNum,
          token: token.trim(),
          workshop: slug,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
      };

      if (!res.ok) {
        setFeedback("error");
        setFeedbackMessage(data.error ?? `Error ${res.status}`);
        return;
      }

      setFeedback("success");
      setFeedbackMessage("Guardado correctamente.");
      await fetchCurrent();
    } catch {
      setFeedback("error");
      setFeedbackMessage("Error de red. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const busy = isSubmitting;

  return (
    <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #3f5e78 1px, transparent 0)`,
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative rounded-2xl border border-brand-grey/25 bg-white/95 p-8 shadow-brand backdrop-blur-sm">
        <div className="absolute left-8 top-0 h-1 w-12 rounded-b-full bg-brand-gold shadow-sm shadow-brand-gold/35" />

        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
          Panel
        </p>
        <h1 className="mt-2 text-center text-xl font-semibold tracking-tight text-brand-slate">
          {title}
        </h1>
        <p className="mt-1 text-center text-sm text-brand-charcoal">
          Actualizar espacios disponibles
        </p>

        <div className="mt-8 rounded-xl border border-brand-grey/20 bg-gradient-to-br from-brand-off to-white p-5 text-center shadow-inner shadow-brand-slate/5">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-charcoal">
            Vista previa
          </p>
          {loadError ? (
            <p className="mt-2 text-sm text-red-600">{loadError}</p>
          ) : preview ? (
            <>
              <p className="mt-2 text-5xl font-bold tabular-nums tracking-tight text-brand-ink">
                {preview.available}
              </p>
              <div className="mx-auto mt-3 h-0.5 w-12 rounded-full bg-brand-gold/90" />
              <p className="mt-3 text-xs text-brand-charcoal">
                Última actualización: {formatUpdatedAt(preview.updatedAt)}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-brand-grey">Cargando…</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor={`${idPrefix}-available`}
              className="block text-sm font-medium text-brand-charcoal"
            >
              Espacios disponibles
            </label>
            <input
              id={`${idPrefix}-available`}
              type="number"
              name="available"
              min={0}
              step={1}
              inputMode="numeric"
              autoComplete="off"
              value={availableInput}
              onChange={(e) => setAvailableInput(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border-brand-grey/35 bg-white text-brand-ink shadow-sm focus:border-brand-blue focus:ring-brand-blue"
              disabled={busy}
            />
          </div>

          <div>
            <label
              htmlFor={`${idPrefix}-token`}
              className="block text-sm font-medium text-brand-charcoal"
            >
              Token de administración
            </label>
            <input
              id={`${idPrefix}-token`}
              type="password"
              name="token"
              autoComplete="current-password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border-brand-grey/35 bg-white text-brand-ink shadow-sm focus:border-brand-blue focus:ring-brand-blue"
              disabled={busy}
              placeholder="••••••••"
            />
          </div>

          {clientError && (
            <p className="text-sm text-red-600" role="alert">
              {clientError}
            </p>
          )}

          {(busy || feedbackMessage) && (
            <p
              className={`text-sm ${
                busy
                  ? "text-brand-charcoal"
                  : feedback === "error"
                    ? "text-red-600"
                    : "text-brand-blue"
              }`}
              role="status"
            >
              {busy && "Guardando…"}
              {!busy && feedbackMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center rounded-xl bg-brand-gold px-4 py-3.5 text-sm font-semibold text-brand-ink shadow-md shadow-brand-gold/25 transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-relaxed text-brand-grey">
          El token no se almacena en el navegador; solo se envía al servidor para
          validar la operación.
        </p>
      </div>
    </div>
  );
}
