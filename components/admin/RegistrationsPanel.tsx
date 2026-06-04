"use client";

import { useCallback, useEffect, useState } from "react";
import { CsvImportPanel } from "@/components/admin/CsvImportPanel";
import { ManualRegisterPanel } from "@/components/admin/ManualRegisterPanel";
import type { WorkshopSlug } from "@/lib/workshop-keys";
import { formatWorkshopDateTime } from "@/lib/workshop-datetime";

type RegistrationRow = {
  id: string;
  attendeeName: string | null;
  attendeeEmail: string;
  attendeePhone: string | null;
  source: string | null;
  workshop: string;
  eventDate: string;
  status: string;
  registeredAt: string;
  emailedAt: string | null;
  emailError: string | null;
  checkedIn: boolean;
  printStatus: string | null;
  printError: string | null;
  printPrintedAt: string | null;
};

function printStatusLabel(status: string | null): string {
  switch (status) {
    case "PENDING":
      return "Label pendiente";
    case "PROCESSING":
      return "Imprimiendo…";
    case "PRINTED":
      return "Label impreso";
    case "FAILED":
      return "Error de impresión";
    default:
      return "Sin label";
  }
}

export type RegistrationsPanelProps = {
  slug: WorkshopSlug;
};

export function RegistrationsPanel({ slug }: RegistrationsPanelProps) {
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [reprintingId, setReprintingId] = useState<string | null>(null);

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

  async function reprintLabel(id: string) {
    setReprintingId(id);
    try {
      const res = await fetch("/api/admin/print-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al encolar impresión");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setReprintingId(null);
    }
  }

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

  return (
    <div>
      <ManualRegisterPanel slug={slug} onRegistered={() => void load()} />
      <CsvImportPanel slug={slug} onImported={() => void load()} />

      {loading && (
        <p className="text-sm text-brand-grey">Cargando registros…</p>
      )}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && !rows.length && (
        <p className="text-sm text-brand-grey">Sin registros aún.</p>
      )}

      {!loading && rows.length > 0 && (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-brand-grey/20 bg-white p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-brand-ink">
                    {r.attendeeName ?? r.attendeeEmail}
                  </p>
                  <p className="text-xs text-brand-grey">{r.attendeeEmail}</p>
                  {r.attendeePhone && (
                    <p className="text-xs text-brand-grey">{r.attendeePhone}</p>
                  )}
                </div>
                {r.source && (
                  <span className="shrink-0 rounded-full bg-brand-off px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-grey">
                    {r.source}
                  </span>
                )}
              </div>
              <p className="mt-1 text-brand-charcoal">
                <span className="text-brand-grey">Evento:</span>{" "}
                {formatWorkshopDateTime(new Date(r.eventDate))}
              </p>
              <p className="text-xs text-brand-grey">
                Registrado:{" "}
                {formatWorkshopDateTime(new Date(r.registeredAt))}
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
                <span
                  className={`text-xs ${
                    r.printStatus === "FAILED"
                      ? "text-red-600"
                      : r.printStatus === "PRINTED"
                        ? "text-brand-grey"
                        : "text-brand-charcoal"
                  }`}
                  title={r.printError ?? undefined}
                >
                  {printStatusLabel(r.printStatus)}
                </span>
                <button
                  type="button"
                  onClick={() => void reprintLabel(r.id)}
                  disabled={reprintingId === r.id}
                  className="text-xs font-medium text-brand-blue underline disabled:opacity-50"
                >
                  {reprintingId === r.id ? "Encolando…" : "Reimprimir label"}
                </button>
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
      )}
    </div>
  );
}
