"use client";

import { useCallback, useEffect, useState } from "react";
import { WORKSHOPS, type WorkshopSlug } from "@/lib/workshop-keys";

type PendingRow = {
  id: string;
  externalOrderId: string;
  email: string;
  name: string | null;
  phone: string | null;
  funnelLabel: string | null;
  ticketQuantity: number;
  createdAt: string;
};

export function PendingPurchasesPanel() {
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pending-purchases");
      const data = (await res.json()) as { pending?: PendingRow[]; error?: string };
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

  async function resolve(row: PendingRow, workshopSlug: WorkshopSlug) {
    setResolvingId(row.id);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/pending-purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookEventId: row.id, workshopSlug }),
      });
      const data = (await res.json()) as {
        error?: string;
        duplicate?: boolean;
        guestInfoUrl?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setMessage(
        data.duplicate
          ? "Este pedido ya estaba registrado."
          : data.guestInfoUrl
            ? "Registro creado. Se pidieron datos de invitados adicionales."
            : "Registro creado y pase enviado por email."
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar");
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <p className="text-sm text-brand-charcoal">
        Compras que llegaron sin taller en el funnel. Usa una URL con{" "}
        <code className="text-xs">?workshop=</code> en ClickFunnels para evitar esto.
      </p>

      {loading && <p className="text-sm text-brand-grey">Cargando…</p>}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>
      )}

      {!loading && rows.length === 0 ? (
        <p className="rounded-xl border border-brand-grey/25 bg-white p-4 text-sm text-brand-charcoal">
          No hay compras sin asignar.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-brand-grey/25 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
                {row.funnelLabel ?? "Funnel desconocido"}
              </p>
              <p className="mt-1 font-semibold text-brand-charcoal">
                {row.name?.trim() || row.email}
              </p>
              <p className="text-sm text-brand-grey">{row.email}</p>
              <p className="mt-2 text-xs text-brand-grey">
                Orden {row.externalOrderId}
                {row.ticketQuantity > 1 ? ` · ${row.ticketQuantity} boletos` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(WORKSHOPS) as WorkshopSlug[]).map((slug) => (
                  <button
                    key={slug}
                    type="button"
                    disabled={resolvingId === row.id}
                    onClick={() => void resolve(row, slug)}
                    className="rounded-lg bg-brand-off px-3 py-2 text-xs font-semibold text-brand-charcoal ring-1 ring-brand-grey/25 disabled:opacity-50"
                  >
                    {resolvingId === row.id ? "…" : WORKSHOPS[slug].label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
