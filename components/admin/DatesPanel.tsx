"use client";

import { useCallback, useEffect, useState } from "react";
import type { WorkshopSlug } from "@/lib/workshop-keys";

type DateRow = {
  id: string;
  workshopSlug: string;
  workshopLabel: string;
  title: string;
  startsAt: string;
  venue: string | null;
  mapsUrl: string | null;
  capacity: number;
  soldCount: number;
  available: number;
  isActive: boolean;
  checkedInCount: number;
};

export type DatesPanelProps = {
  slug: WorkshopSlug;
};

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DatesPanel({ slug }: DatesPanelProps) {
  const [rows, setRows] = useState<DateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    title: "",
    startsAt: "",
    venue: "",
    mapsUrl: "",
    capacity: "25",
  });

  const [editForm, setEditForm] = useState({
    title: "",
    startsAt: "",
    venue: "",
    mapsUrl: "",
    capacity: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ w: slug });
      const res = await fetch(`/api/admin/dates?${params}`);
      const data = (await res.json()) as { error?: string; dates?: DateRow[] };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setRows(data.dates ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las fechas");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function postDate(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workshop: slug, ...body }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSavingId("create");
    setError(null);
    try {
      const capacity = Number.parseInt(createForm.capacity, 10);
      await postDate({
        title: createForm.title.trim() || undefined,
        startsAt: createForm.startsAt
          ? new Date(createForm.startsAt).toISOString()
          : undefined,
        venue: createForm.venue.trim() || undefined,
        mapsUrl: createForm.mapsUrl.trim() || undefined,
        capacity: Number.isInteger(capacity) ? capacity : 25,
        isActive: rows.length === 0,
      });
      setShowCreate(false);
      setCreateForm({ title: "", startsAt: "", venue: "", mapsUrl: "", capacity: "25" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear");
    } finally {
      setSavingId(null);
    }
  }

  function startEdit(row: DateRow) {
    setEditingId(row.id);
    setEditForm({
      title: row.title,
      startsAt: toLocalInputValue(row.startsAt),
      venue: row.venue ?? "",
      mapsUrl: row.mapsUrl ?? "",
      capacity: String(row.capacity),
    });
  }

  async function handleSaveEdit(dateId: string) {
    setSavingId(dateId);
    setError(null);
    try {
      const capacity = Number.parseInt(editForm.capacity, 10);
      await postDate({
        dateId,
        title: editForm.title.trim(),
        startsAt: new Date(editForm.startsAt).toISOString(),
        venue: editForm.venue.trim() || "",
        mapsUrl: editForm.mapsUrl.trim() || "",
        capacity: Number.isInteger(capacity) ? capacity : undefined,
      });
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSavingId(null);
    }
  }

  async function handleActivate(dateId: string) {
    setSavingId(dateId);
    setError(null);
    try {
      await postDate({ dateId, isActive: true });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al activar");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="pb-4">
      <div className="rounded-2xl border border-brand-grey/30 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-brand-slate">Fechas del taller</h2>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="rounded-lg bg-brand-yellow px-3 py-1.5 text-xs font-semibold text-brand-charcoal"
          >
            {showCreate ? "Cancelar" : "Nueva fecha"}
          </button>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {showCreate && (
          <form onSubmit={(e) => void handleCreate(e)} className="mt-4 space-y-3 border-t border-brand-grey/20 pt-4">
            <label className="block text-xs font-medium text-brand-charcoal">
              Título
              <input
                type="text"
                value={createForm.title}
                onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-brand-grey/40 px-3 py-2 text-sm"
                placeholder="Ej. Sesión en vivo — marzo"
              />
            </label>
            <label className="block text-xs font-medium text-brand-charcoal">
              Fecha y hora
              <input
                type="datetime-local"
                required
                value={createForm.startsAt}
                onChange={(e) => setCreateForm((f) => ({ ...f, startsAt: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-brand-grey/40 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-brand-charcoal">
              Lugar (dirección o nombre del venue)
              <input
                type="text"
                value={createForm.venue}
                onChange={(e) => setCreateForm((f) => ({ ...f, venue: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-brand-grey/40 px-3 py-2 text-sm"
                placeholder="Ej. Centro de Convenciones, San Juan"
              />
            </label>
            <label className="block text-xs font-medium text-brand-charcoal">
              Enlace Google Maps (opcional)
              <input
                type="url"
                value={createForm.mapsUrl}
                onChange={(e) => setCreateForm((f) => ({ ...f, mapsUrl: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-brand-grey/40 px-3 py-2 text-sm"
                placeholder="https://maps.google.com/..."
              />
            </label>
            <label className="block text-xs font-medium text-brand-charcoal">
              Cupos
              <input
                type="number"
                min={0}
                value={createForm.capacity}
                onChange={(e) => setCreateForm((f) => ({ ...f, capacity: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-brand-grey/40 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={savingId === "create"}
              className="w-full rounded-lg bg-brand-slate py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {savingId === "create" ? "Guardando…" : "Crear fecha"}
            </button>
          </form>
        )}

        {loading ? (
          <p className="mt-4 text-sm text-brand-grey">Cargando fechas…</p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-brand-grey">No hay fechas. Crea la primera.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-brand-grey/25 p-3 text-sm"
              >
                {editingId === row.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                    <input
                      type="datetime-local"
                      value={editForm.startsAt}
                      onChange={(e) => setEditForm((f) => ({ ...f, startsAt: e.target.value }))}
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                    <input
                      type="text"
                      value={editForm.venue}
                      onChange={(e) => setEditForm((f) => ({ ...f, venue: e.target.value }))}
                      placeholder="Lugar / dirección"
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                    <input
                      type="url"
                      value={editForm.mapsUrl}
                      onChange={(e) => setEditForm((f) => ({ ...f, mapsUrl: e.target.value }))}
                      placeholder="Enlace Google Maps"
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      value={editForm.capacity}
                      onChange={(e) => setEditForm((f) => ({ ...f, capacity: e.target.value }))}
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveEdit(row.id)}
                        disabled={savingId === row.id}
                        className="flex-1 rounded bg-brand-slate py-1.5 text-xs font-semibold text-white"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded border px-3 py-1.5 text-xs"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-brand-charcoal">{row.title}</p>
                        <p className="text-brand-grey">{formatDateTime(row.startsAt)}</p>
                        {row.venue && (
                          <p className="text-brand-grey">{row.venue}</p>
                        )}
                      </div>
                      {row.isActive ? (
                        <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                          Activa
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-brand-grey">
                      Cupos: {row.soldCount}/{row.capacity} vendidos · {row.available} disponibles ·{" "}
                      {row.checkedInCount} check-ins
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="text-xs text-brand-blue underline"
                      >
                        Editar
                      </button>
                      {!row.isActive && (
                        <button
                          type="button"
                          onClick={() => void handleActivate(row.id)}
                          disabled={savingId === row.id}
                          className="text-xs font-semibold text-brand-charcoal underline disabled:opacity-50"
                        >
                          Activar
                        </button>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
