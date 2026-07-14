"use client";

import { useCallback, useEffect, useState } from "react";

type GuestRow = {
  id: string;
  buyerName: string;
  buyerEmail: string;
  workshopLabel: string;
  slotsNeeded: number;
  slotsCompleted: number;
  expiresAt: string;
  createdAt: string;
};

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function GuestInfoRequestsPanel() {
  const [rows, setRows] = useState<GuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/guest-info-requests");
      const data = (await res.json()) as { pending?: GuestRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setRows(data.pending ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4 pb-4">
      <p className="text-sm text-brand-charcoal">
        Compradores con boletos extra que aún no completaron los datos de sus invitados.
        El comprador recibe un email con el enlace al formulario.
      </p>

      {loading && <p className="text-sm text-brand-grey">Cargando…</p>}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {!loading && rows.length === 0 ? (
        <p className="rounded-xl border border-brand-grey/25 bg-white p-4 text-sm text-brand-charcoal">
          No hay invitados pendientes.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-brand-grey/25 bg-white p-4 shadow-sm"
            >
              <p className="font-semibold text-brand-charcoal">{row.buyerName}</p>
              <p className="text-sm text-brand-grey">{row.buyerEmail}</p>
              <p className="mt-2 text-sm text-brand-charcoal">{row.workshopLabel}</p>
              <p className="mt-2 text-xs text-brand-grey">
                Faltan {row.slotsNeeded - row.slotsCompleted} de {row.slotsNeeded}{" "}
                invitado(s) · vence {formatWhen(row.expiresAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
