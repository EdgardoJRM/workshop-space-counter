"use client";

import { useState } from "react";
import { AdminFeedbackBanner, type AdminFeedback } from "@/components/admin/AdminFeedbackBanner";
import type { WorkshopSlug } from "@/lib/workshop-keys";

export type ManualRegisterResult = {
  registrationId?: string;
  email: string;
  name: string | null;
  duplicate: boolean;
  sendEmail: boolean;
};

export type ManualRegisterPanelProps = {
  slug: WorkshopSlug;
  workshopDateId: string;
  selectedDateLabel?: string;
  onRegistered: (result: ManualRegisterResult) => void;
};

export function ManualRegisterPanel({
  slug,
  workshopDateId,
  selectedDateLabel,
  onRegistered,
}: ManualRegisterPanelProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<AdminFeedback | null>(null);
  const [open, setOpen] = useState(false);

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
          workshopDateId,
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
            Se registrará en la fecha seleccionada arriba
            {selectedDateLabel ? `: ${selectedDateLabel}` : ""}.
          </p>

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
            disabled={saving || !workshopDateId || !email.trim()}
            className="w-full rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Registrando…" : "Registrar persona"}
          </button>
        </form>
      )}
    </section>
  );
}
