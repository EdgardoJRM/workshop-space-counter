"use client";

import { useCallback, useEffect, useState } from "react";
import type { WorkshopSlug } from "@/lib/workshop-keys";

type RegistrationRow = {
  id: string;
  attendeeName: string | null;
  attendeeEmail: string;
  workshop: string;
  eventDate: string;
  status: string;
  registeredAt: string;
  emailedAt: string | null;
  emailError: string | null;
  checkedIn: boolean;
};

export type RegistrationsPanelProps = {
  slug: WorkshopSlug;
};

export function RegistrationsPanel({ slug }: RegistrationsPanelProps) {
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ w: slug });
      const res = await fetch(`/api/admin/registrations?${params}`);
      const data = (await res.json()) as {
        error?: string;
        registrations?: RegistrationRow[];
      };
      if (res.status === 401) {
        throw new Error("Sesión expirada. Vuelve a iniciar sesión.");
      }
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setRows(data.registrations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function resend(id: string) {
    setResendingId(id);
    try {
      const res = await fetch("/api/admin/resend-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al reenviar");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setResendingId(null);
    }
  }

  if (loading) return <p className="text-sm text-brand-grey">Cargando registros…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!rows.length) {
    return <p className="text-sm text-brand-grey">Sin registros aún.</p>;
  }

  return (
    <ul className="mt-4 space-y-3">
      {rows.map((r) => (
        <li
          key={r.id}
          className="rounded-lg border border-brand-grey/20 bg-white p-3 text-sm"
        >
          <p className="font-medium text-brand-ink">
            {r.attendeeName ?? r.attendeeEmail}
          </p>
          <p className="text-xs text-brand-grey">{r.attendeeEmail}</p>
          <p className="mt-1 text-brand-charcoal">
            {new Date(r.eventDate).toLocaleString("es")}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {r.checkedIn ? (
              <span className="rounded-full bg-brand-blue/15 px-2 py-0.5 text-xs text-brand-blue">
                Check-in
              </span>
            ) : (
              <span className="rounded-full bg-brand-off px-2 py-0.5 text-xs text-brand-charcoal">
                Pendiente
              </span>
            )}
            {r.emailedAt ? (
              <span className="text-xs text-brand-grey">Email enviado</span>
            ) : (
              <span className="text-xs text-amber-700">
                {r.emailError ?? "Email pendiente"}
              </span>
            )}
            <button
              type="button"
              onClick={() => void resend(r.id)}
              disabled={resendingId === r.id}
              className="ml-auto text-xs font-medium text-brand-blue underline disabled:opacity-50"
            >
              {resendingId === r.id ? "Enviando…" : "Reenviar pase"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
