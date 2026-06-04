"use client";

import { useCallback, useEffect, useState } from "react";
import type { WorkshopSlug } from "@/lib/workshop-keys";
import { formatWorkshopDateTime } from "@/lib/workshop-datetime";

type DateOption = {
  id: string;
  title: string;
  startsAt: string;
  isActive: boolean;
};

export type ManualRegisterPanelProps = {
  slug: WorkshopSlug;
  onRegistered: () => void;
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
      const active = list.find((d) => d.isActive);
      setWorkshopDateId((prev) => prev || active?.id || list[0]?.id || "");
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
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workshop: slug,
          name: name.trim() || null,
          email: email.trim(),
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
        setSuccess("Ya estaba registrado en esa fecha. No se creó un duplicado.");
      } else {
        setSuccess(sendEmail ? "Registrado y pase enviado por email." : "Registrado sin enviar email.");
        setName("");
        setEmail("");
        setPhone("");
      }
      onRegistered();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al registrar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-brand-grey/20 bg-brand-off/40 p-4">
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
          <p className="text-xs text-brand-grey">
            Crea un registro y pase como si hubiera comprado en ClickFunnels. Usa la fecha del
            evento que elijas (por defecto la fecha activa).
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
                  {d.isActive ? " · activa" : ""}
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

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-700" role="status">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || loadingDates || !dates.length || !email.trim()}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Registrando…" : "Registrar"}
          </button>
        </form>
      )}
    </section>
  );
}
