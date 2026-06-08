"use client";

import { useCallback, useEffect, useState } from "react";

type GuestSlot = {
  name: string;
  email: string;
  phone: string;
};

type GuestInfoView = {
  status: string;
  slotsNeeded: number;
  workshopLabel: string;
  eventDate: string;
  venue: string | null;
  buyerName: string;
  expired: boolean;
};

type Props = {
  token: string;
};

function emptySlots(count: number): GuestSlot[] {
  return Array.from({ length: count }, () => ({ name: "", email: "", phone: "" }));
}

export function GuestInfoForm({ token }: Props) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<GuestInfoView | null>(null);
  const [slots, setSlots] = useState<GuestSlot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/guest-info/${encodeURIComponent(token)}`);
      if (!res.ok) {
        setError(res.status === 404 ? "Enlace no válido." : "No se pudo cargar el formulario.");
        setView(null);
        return;
      }
      const data = (await res.json()) as GuestInfoView;
      setView(data);
      setSlots(emptySlots(data.slotsNeeded));
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateSlot(index: number, field: keyof GuestSlot, value: string) {
    setSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!view || view.expired || view.status === "COMPLETED") return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/guest-info/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guests: slots.map((s) => ({
            name: s.name.trim(),
            email: s.email.trim(),
            phone: s.phone.trim() || null,
          })),
        }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        setError(data.error ?? "No se pudo guardar. Revisa los datos.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <p className="text-center text-sm text-brand-grey">Cargando formulario…</p>
    );
  }

  if (!view) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">
        {error ?? "Enlace no válido."}
      </div>
    );
  }

  if (view.expired || view.status === "EXPIRED") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm font-medium text-amber-900">Este enlace ha expirado.</p>
        <p className="mt-2 text-sm text-amber-800">
          Contacta a soporte con el nombre del comprador ({view.buyerName}) para
          completar el registro de invitados.
        </p>
      </div>
    );
  }

  if (view.status === "COMPLETED" || success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-lg font-semibold text-emerald-900">¡Listo!</p>
        <p className="mt-2 text-sm text-emerald-800">
          Los invitados quedaron registrados. Cada uno recibirá su pase por correo.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-brand-grey/20 bg-brand-off/50 p-4 text-center text-sm text-brand-charcoal">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
          {view.workshopLabel}
        </p>
        <p className="mt-1 font-medium">{view.eventDate}</p>
        {view.venue && <p className="mt-1 text-brand-grey">{view.venue}</p>}
        <p className="mt-3 text-xs text-brand-grey">
          Compra a nombre de <strong className="text-brand-charcoal">{view.buyerName}</strong>
        </p>
      </div>

      <p className="text-center text-sm text-brand-charcoal">
        Completa los datos de{" "}
        <strong>
          {view.slotsNeeded} invitado{view.slotsNeeded === 1 ? "" : "s"}
        </strong>
        . Cada persona recibirá su propio pase por email.
      </p>

      {slots.map((slot, index) => (
        <fieldset
          key={index}
          className="rounded-xl border border-brand-grey/15 bg-white p-5 shadow-sm"
        >
          <legend className="px-1 text-sm font-semibold text-brand-slate">
            Invitado {index + 1}
          </legend>
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-brand-grey">Nombre *</span>
              <input
                type="text"
                required
                value={slot.name}
                onChange={(e) => updateSlot(index, "name", e.target.value)}
                className="mt-1 w-full rounded-lg border border-brand-grey/25 px-3 py-2 text-sm"
                autoComplete="name"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-brand-grey">Email *</span>
              <input
                type="email"
                required
                value={slot.email}
                onChange={(e) => updateSlot(index, "email", e.target.value)}
                className="mt-1 w-full rounded-lg border border-brand-grey/25 px-3 py-2 text-sm"
                autoComplete="email"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-brand-grey">Teléfono (opcional)</span>
              <input
                type="tel"
                value={slot.phone}
                onChange={(e) => updateSlot(index, "phone", e.target.value)}
                className="mt-1 w-full rounded-lg border border-brand-grey/25 px-3 py-2 text-sm"
                autoComplete="tel"
              />
            </label>
          </div>
        </fieldset>
      ))}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-brand-gold py-3 text-sm font-bold text-brand-slate shadow-sm disabled:opacity-60"
      >
        {submitting ? "Guardando…" : "Registrar invitados y enviar pases"}
      </button>
    </form>
  );
}
