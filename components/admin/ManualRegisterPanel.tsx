"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminFeedbackBanner, type AdminFeedback } from "@/components/admin/AdminFeedbackBanner";
import type { WorkshopSlug } from "@/lib/workshop-keys";
import { formatWorkshopDateTime } from "@/lib/workshop-datetime";

type DateOption = {
  id: string;
  title: string;
  startsAt: string;
  isActive: boolean;
  isSelling: boolean;
};

export type ManualRegisterResult = {
  registrationId?: string;
  email: string;
  name: string | null;
  duplicate: boolean;
  sendEmail: boolean;
};

export type ManualRegisterPanelProps = {
  slug: WorkshopSlug;
  onRegistered: (result: ManualRegisterResult) => void;
};

export function ManualRegisterPanel({ slug, onRegistered }: ManualRegisterPanelProps) {
  const [dates, setDates] = useState<DateOption[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [workshopDateId, setWorkshopDateId] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<AdminFeedback | null>(null);
  const [open, setOpen] = useState(false);

  const loadDates = useCallback(async () => {
    setLoadingDates(true);
    try {
      const params = new URLSearchParams({ w: slug });
      const res = await fetch(`/api/admin/dates?${params}`);
      const data = (await res.json()) as {
        error?: string;
        dates?: DateOption[];
      };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      const list = data.dates ?? [];
      setDates(list);
      const selling =
        list.find((d) => d.isSelling) ??
        list.find((d) => d.isActive) ??
        list[0];
      setWorkshopDateId((prev) => prev || selling?.id || "");
    } catch {
      setDates([]);
    } finally {
      setLoadingDates(false);
    }
  }, [slug]);

  useEffect(() => {
    if (open) void loadDates();
  }, [open, loadDates]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim() || null;

    try {
      const res = await fetch("/api/admin/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workshop: slug,
          name: trimmedName,
          email: trimmedEmail,
          phone: phone.trim() || null,
          workshopDateId: workshopDateId || null,
          sendPassEmail: sendEmail,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        duplicate?: boolean;
        registrationId?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);

      if (data.duplicate) {
        setFeedback({
          type: "info",
          title: "Ya estaba registrado",
          message: `${trimmedEmail} ya tenía pase en esta fecha. No se creó duplicado.`,
        });
      } else {
        setFeedback({
          type: "success",
          title: "Persona registrada",
          message: sendEmail
            ? `${trimmedName ?? trimmedEmail} quedó registrado y se envió el pase por email.`
            : `${trimmedName ?? trimmedEmail} quedó registrado sin enviar email.`,
        });
        setName("");
        setEmail("");
        setPhone("");
      }

      onRegistered({
        registrationId: data.registrationId,
        email: trimmedEmail,
        name: trimmedName,
        duplicate: Boolean(data.duplicate),
        sendEmail,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        title: "No se pudo registrar",
        message: err instanceof Error ? err.message : "Error al registrar",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-brand-grey/20 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-brand-ink"
      >
        Registrar persona manualmente
        <span className="text-brand-grey">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3">
          <AdminFeedbackBanner
            feedback={feedback}
            onDismiss={() => setFeedback(null)}
          />

          <p className="text-xs text-brand-grey">
            Crea un registro y pase como si hubiera comprado en ClickFunnels. Por defecto
            usa la fecha marcada como en venta.
          </p>

          <label className="block text-xs font-medium text-brand-charcoal">
            Fecha del evento
            <select
              value={workshopDateId}
              onChange={(e) => setWorkshopDateId(e.target.value)}
              disabled={loadingDates || !dates.length}
              className="mt-1 w-full rounded-lg border border-brand-grey/30 bg-white px-3 py-2 text-sm"
              required
            >
              {loadingDates && <option value="">Cargando fechas…</option>}
              {!loadingDates && !dates.length && (
                <option value="">Sin fechas — créala en Fechas</option>
              )}
              {dates.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} — {formatWorkshopDateTime(new Date(d.startsAt))}
                  {d.isSelling ? " · en venta" : d.isActive ? " · activa" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-brand-charcoal">
            Nombre
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-grey/30 bg-white px-3 py-2 text-sm"
              placeholder="Nombre completo"
            />
          </label>

          <label className="block text-xs font-medium text-brand-charcoal">
            Email <span className="text-red-600">*</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-brand-grey/30 bg-white px-3 py-2 text-sm"
              placeholder="correo@ejemplo.com"
            />
          </label>

          <label className="block text-xs font-medium text-brand-charcoal">
            Teléfono
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-grey/30 bg-white px-3 py-2 text-sm"
              placeholder="7875551234"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-brand-charcoal">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="rounded border-brand-grey/40"
            />
            Enviar pase por email
          </label>

          <button
            type="submit"
            disabled={saving || loadingDates || !dates.length || !email.trim()}
            className="w-full rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Registrando…" : "Registrar persona"}
          </button>
        </form>
      )}
    </section>
  );
}
