"use client";

import { useEffect, useState } from "react";
import type { WorkshopSlug } from "@/lib/workshop-keys";
import { formatWorkshopDateTime } from "@/lib/workshop-datetime";
import type { RegistrationListCardRow } from "@/components/admin/RegistrationListCard";

type DateOption = {
  id: string;
  title: string;
  startsAt: string;
};

type Props = {
  open: boolean;
  row: RegistrationListCardRow | null;
  dates: DateOption[];
  currentWorkshopDateId: string;
  slug: WorkshopSlug;
  onClose: () => void;
  onSaved: () => void;
};

export function RegistrationEditModal({
  open,
  row,
  dates,
  currentWorkshopDateId,
  slug,
  onClose,
  onSaved,
}: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [workshopDateId, setWorkshopDateId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row) return;
    setName(row.attendeeName ?? "");
    setEmail(row.attendeeEmail);
    setPhone(row.attendeePhone ?? "");
    setWorkshopDateId(currentWorkshopDateId);
    setError(null);
  }, [open, row, currentWorkshopDateId]);

  if (!open || !row) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail.includes("@")) {
        throw new Error("Email inválido");
      }

      const nameChanged = name.trim() !== (row!.attendeeName ?? "");
      const emailChanged = trimmedEmail !== row!.attendeeEmail.toLowerCase();
      const phoneChanged = phone.trim() !== (row!.attendeePhone ?? "");
      const dateChanged = workshopDateId !== currentWorkshopDateId;

      if (nameChanged || emailChanged || phoneChanged) {
        const res = await fetch("/api/admin/registrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            registrationId: row!.id,
            name: name.trim(),
            email: trimmedEmail,
            phone: phone.trim() || null,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "No se pudo actualizar");
      }

      if (dateChanged) {
        const res = await fetch("/api/admin/registrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "moveDate",
            registrationId: row!.id,
            workshopDateId,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "No se pudo mover la fecha");
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-registration-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h2 id="edit-registration-title" className="text-lg font-semibold text-brand-ink">
          Editar persona
        </h2>
        <p className="mt-1 text-sm text-brand-grey">{row.attendeeEmail}</p>

        <form onSubmit={(e) => void handleSave(e)} className="mt-4 space-y-3">
          <label className="block text-xs font-medium text-brand-charcoal">
            Nombre
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-grey/30 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-xs font-medium text-brand-charcoal">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-brand-grey/30 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-xs font-medium text-brand-charcoal">
            Teléfono
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-grey/30 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-xs font-medium text-brand-charcoal">
            Fecha del taller
            <select
              value={workshopDateId}
              onChange={(e) => setWorkshopDateId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-grey/30 px-3 py-2 text-sm"
            >
              {dates.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} — {formatWorkshopDateTime(new Date(d.startsAt))}
                </option>
              ))}
            </select>
          </label>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-brand-grey/30 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-slate px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
