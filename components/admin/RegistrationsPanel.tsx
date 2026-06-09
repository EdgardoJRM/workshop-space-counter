"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminFeedbackBanner, type AdminFeedback } from "@/components/admin/AdminFeedbackBanner";
import { CsvImportPanel } from "@/components/admin/CsvImportPanel";
import {
  ManualRegisterPanel,
  type ManualRegisterResult,
} from "@/components/admin/ManualRegisterPanel";
import { RegistrationListCard } from "@/components/admin/RegistrationListCard";
import type { WorkshopSlug } from "@/lib/workshop-keys";

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
  certificateEmailedAt: string | null;
  certificateError: string | null;
  printStatus: string | null;
  printError: string | null;
  printPrintedAt: string | null;
};

export type RegistrationsPanelProps = {
  slug: WorkshopSlug;
};

export function RegistrationsPanel({ slug }: RegistrationsPanelProps) {
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [filtered, setFiltered] = useState<RegistrationRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AdminFeedback | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendingCertificateId, setResendingCertificateId] = useState<string | null>(null);
  const [reprintingId, setReprintingId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const cardRefs = useRef<Record<string, HTMLLIElement | null>>({});

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

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setFiltered(rows);
      return;
    }
    setFiltered(
      rows.filter(
        (r) =>
          r.attendeeEmail.toLowerCase().includes(q) ||
          (r.attendeeName ?? "").toLowerCase().includes(q) ||
          (r.attendeePhone ?? "").includes(q)
      )
    );
  }, [rows, search]);

  useEffect(() => {
    if (!highlightId) return;
    const node = cardRefs.current[highlightId];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    const timer = window.setTimeout(() => setHighlightId(null), 8000);
    return () => window.clearTimeout(timer);
  }, [highlightId, filtered]);

  function handleManualRegistered(result: ManualRegisterResult) {
    if (result.duplicate) {
      const existing = rows.find(
        (r) => r.attendeeEmail.toLowerCase() === result.email.toLowerCase()
      );
      if (existing) setHighlightId(existing.id);
    } else if (result.registrationId) {
      setHighlightId(result.registrationId);
      setFeedback({
        type: "success",
        title: "Registro confirmado",
        message: `${result.name ?? result.email} aparece en la lista de abajo.`,
      });
    }
    void load();
  }

  async function reprintLabel(id: string) {
    setReprintingId(id);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/print-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al encolar impresión");
      setFeedback({
        type: "success",
        title: "Label encolado",
        message: "La impresión se procesará en la impresora conectada.",
      });
      await load();
    } catch (e) {
      setFeedback({
        type: "error",
        title: "No se pudo reimprimir",
        message: e instanceof Error ? e.message : "Error",
      });
    } finally {
      setReprintingId(null);
    }
  }

  async function resendCertificate(id: string) {
    setResendingCertificateId(id);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/resend-certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al reenviar certificado");
      setFeedback({
        type: "success",
        title: "Certificado reenviado",
        message: "El correo con el enlace al certificado fue enviado de nuevo.",
      });
      await load();
    } catch (e) {
      setFeedback({
        type: "error",
        title: "No se pudo reenviar certificado",
        message: e instanceof Error ? e.message : "Error",
      });
    } finally {
      setResendingCertificateId(null);
    }
  }

  async function resend(id: string) {
    setResendingId(id);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/resend-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al reenviar");
      setFeedback({
        type: "success",
        title: "Pase reenviado",
        message: "El correo con el pase fue enviado de nuevo.",
      });
      await load();
    } catch (e) {
      setFeedback({
        type: "error",
        title: "No se pudo reenviar",
        message: e instanceof Error ? e.message : "Error",
      });
    } finally {
      setResendingId(null);
    }
  }

  return (
    <div>
      <AdminFeedbackBanner
        feedback={feedback}
        onDismiss={() => setFeedback(null)}
      />

      <ManualRegisterPanel slug={slug} onRegistered={handleManualRegistered} />
      <CsvImportPanel
        slug={slug}
        onImported={() => {
          setFeedback({
            type: "success",
            title: "Importación completada",
            message: "Los registros nuevos ya están en la lista.",
          });
          void load();
        }}
      />

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-brand-slate">Registros recientes</h2>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email…"
          className="w-full rounded-lg border border-brand-grey/30 bg-white px-3 py-2 text-sm sm:max-w-xs"
        />
      </div>

      {loading && (
        <p className="text-sm text-brand-grey">Cargando registros…</p>
      )}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && !filtered.length && (
        <p className="text-sm text-brand-grey">
          {search.trim() ? "Sin resultados para esa búsqueda." : "Sin registros aún."}
        </p>
      )}

      {!loading && filtered.length > 0 && (
        <ul ref={listRef} className="space-y-3">
          {filtered.map((r) => (
            <RegistrationListCard
              key={r.id}
              ref={(el) => {
                cardRefs.current[r.id] = el;
              }}
              row={r}
              highlighted={highlightId === r.id}
              resending={resendingId === r.id}
              resendingCertificate={resendingCertificateId === r.id}
              reprinting={reprintingId === r.id}
              onResend={() => void resend(r.id)}
              onResendCertificate={() => void resendCertificate(r.id)}
              onReprint={() => void reprintLabel(r.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
