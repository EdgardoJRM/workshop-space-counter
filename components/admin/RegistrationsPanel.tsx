"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminFeedbackBanner, type AdminFeedback } from "@/components/admin/AdminFeedbackBanner";
import { CsvImportPanel } from "@/components/admin/CsvImportPanel";
import {
  ManualRegisterPanel,
  type ManualRegisterResult,
} from "@/components/admin/ManualRegisterPanel";
import { RegistrationListCard } from "@/components/admin/RegistrationListCard";
import { RegistrationEditModal } from "@/components/admin/RegistrationEditModal";
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
  certificateEmailedAt: string | null;
  certificateError: string | null;
  printStatus: string | null;
  printError: string | null;
  printPrintedAt: string | null;
};

type DateOption = {
  id: string;
  title: string;
  startsAt: string;
  isActive: boolean;
  isSelling: boolean;
};

export type RegistrationsPanelProps = {
  slug: WorkshopSlug;
};

function defaultDateId(dates: DateOption[]): string {
  return (
    dates.find((d) => d.isSelling)?.id ??
    dates.find((d) => d.isActive)?.id ??
    dates[0]?.id ??
    ""
  );
}

export function RegistrationsPanel({ slug }: RegistrationsPanelProps) {
  const [dates, setDates] = useState<DateOption[]>([]);
  const [workshopDateId, setWorkshopDateId] = useState("");
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [filtered, setFiltered] = useState<RegistrationRow[]>([]);
  const [search, setSearch] = useState("");
  const [loadingDates, setLoadingDates] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AdminFeedback | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendingCertificateId, setResendingCertificateId] = useState<string | null>(null);
  const [certificatesEnabled, setCertificatesEnabled] = useState(false);
  const [certificatesSendMode, setCertificatesSendMode] = useState<"checkin" | "post_workshop">(
    "checkin"
  );
  const [reprintingId, setReprintingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<RegistrationRow | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const cardRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const loadDates = useCallback(async () => {
    setLoadingDates(true);
    setError(null);
    try {
      const params = new URLSearchParams({ w: slug });
      const res = await fetch(`/api/admin/dates?${params}`);
      const data = (await res.json()) as { error?: string; dates?: DateOption[] };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      const list = data.dates ?? [];
      setDates(list);
      setWorkshopDateId((prev) => {
        if (prev && list.some((d) => d.id === prev)) return prev;
        return defaultDateId(list);
      });
    } catch (e) {
      setDates([]);
      setWorkshopDateId("");
      setError(e instanceof Error ? e.message : "Error al cargar fechas");
    } finally {
      setLoadingDates(false);
    }
  }, [slug]);

  const load = useCallback(async () => {
    if (!workshopDateId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ w: slug, workshopDateId });
      const res = await fetch(`/api/admin/registrations?${params}`);
      const data = (await res.json()) as {
        error?: string;
        certificatesEnabled?: boolean;
        certificatesSendMode?: "checkin" | "post_workshop";
        registrations?: RegistrationRow[];
      };
      if (res.status === 401) {
        throw new Error("Sesión expirada. Vuelve a iniciar sesión.");
      }
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setCertificatesEnabled(Boolean(data.certificatesEnabled));
      setCertificatesSendMode(
        data.certificatesSendMode === "post_workshop" ? "post_workshop" : "checkin"
      );
      setRows(data.registrations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [slug, workshopDateId]);

  useEffect(() => {
    void loadDates();
  }, [loadDates]);

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

  const selectedDate = dates.find((d) => d.id === workshopDateId) ?? null;

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
        message: `${result.name ?? result.email} aparece en la lista de esta fecha.`,
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

  async function cancelRegistration(id: string) {
    if (!window.confirm("¿Cancelar este registro? La persona dejará de aparecer en la lista activa.")) {
      return;
    }
    setCancellingId(id);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", registrationId: id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo cancelar");
      setFeedback({
        type: "success",
        title: "Registro cancelado",
        message: "La persona ya no aparece en la lista de confirmados.",
      });
      await load();
    } catch (e) {
      setFeedback({
        type: "error",
        title: "No se pudo cancelar",
        message: e instanceof Error ? e.message : "Error",
      });
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div>
      <AdminFeedbackBanner
        feedback={feedback}
        onDismiss={() => setFeedback(null)}
      />

      <div className="mb-4 rounded-xl border border-brand-grey/20 bg-white p-4 shadow-sm">
        <label className="block text-xs font-semibold uppercase tracking-wide text-brand-blue">
          Fecha del evento
        </label>
        <p className="mt-1 text-sm text-brand-charcoal">
          La lista muestra solo personas registradas en esta fecha (no todas las fechas del
          taller).
        </p>
        <select
          value={workshopDateId}
          onChange={(e) => setWorkshopDateId(e.target.value)}
          disabled={loadingDates || !dates.length}
          className="mt-3 w-full rounded-lg border border-brand-grey/30 bg-white px-3 py-2.5 text-sm"
        >
          {loadingDates && <option value="">Cargando fechas…</option>}
          {!loadingDates && !dates.length && (
            <option value="">Sin fechas — créala en Fechas</option>
          )}
          {dates.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title} — {formatWorkshopDateTime(new Date(d.startsAt))}
              {d.isSelling ? " · en venta" : ""}
              {d.isActive ? " · evento de hoy" : ""}
            </option>
          ))}
        </select>
        {selectedDate ? (
          <p className="mt-2 text-xs text-brand-grey">
            {filtered.length} persona(s) en esta fecha
            {loading ? " · actualizando…" : ""}
          </p>
        ) : null}
      </div>

      {workshopDateId ? (
        <>
          <ManualRegisterPanel
            slug={slug}
            workshopDateId={workshopDateId}
            selectedDateLabel={
              selectedDate
                ? `${selectedDate.title} — ${formatWorkshopDateTime(new Date(selectedDate.startsAt))}`
                : undefined
            }
            onRegistered={handleManualRegistered}
          />
          <CsvImportPanel
            slug={slug}
            workshopDateId={workshopDateId}
            onImported={() => {
              setFeedback({
                type: "success",
                title: "Importación completada",
                message: "Los registros nuevos ya están en la lista de esta fecha.",
              });
              void load();
            }}
          />
        </>
      ) : null}

      {certificatesEnabled ? (
        <p className="mb-3 text-xs text-brand-grey">
          Certificados: envío automático{" "}
          {certificatesSendMode === "checkin"
            ? "al hacer check-in (escaneo QR)."
            : "al terminar el taller (cron diario)."}
        </p>
      ) : null}

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-brand-slate">Personas de esta fecha</h2>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email…"
          disabled={!workshopDateId}
          className="w-full rounded-lg border border-brand-grey/30 bg-white px-3 py-2 text-sm sm:max-w-xs disabled:opacity-50"
        />
      </div>

      {loadingDates && (
        <p className="text-sm text-brand-grey">Cargando fechas…</p>
      )}
      {loading && workshopDateId && (
        <p className="text-sm text-brand-grey">Cargando registros…</p>
      )}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {!loading && workshopDateId && !error && !filtered.length && (
        <p className="text-sm text-brand-grey">
          {search.trim() ? "Sin resultados para esa búsqueda." : "Sin registros en esta fecha."}
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
              certificatesEnabled={certificatesEnabled}
              resendingCertificate={resendingCertificateId === r.id}
              reprinting={reprintingId === r.id}
              cancelling={cancellingId === r.id}
              onEdit={() => setEditingRow(r)}
              onCancel={() => void cancelRegistration(r.id)}
              onResend={() => void resend(r.id)}
              onResendCertificate={() => void resendCertificate(r.id)}
              onReprint={() => void reprintLabel(r.id)}
            />
          ))}
        </ul>
      )}

      <RegistrationEditModal
        open={editingRow !== null}
        row={editingRow}
        dates={dates}
        currentWorkshopDateId={workshopDateId}
        slug={slug}
        onClose={() => setEditingRow(null)}
        onSaved={() => {
          setFeedback({
            type: "success",
            title: "Cambios guardados",
            message: "Los datos de la persona fueron actualizados.",
          });
          void load();
        }}
      />
    </div>
  );
}
