"use client";

import { useCallback, useEffect, useState } from "react";
import type { WorkshopSlug } from "@/lib/workshop-keys";

type TemplateForm = {
  fontLarge: string;
  fontSmall: string;
  mediaSize: string;
  showEmail: boolean;
  showWorkshop: boolean;
};

export type LabelPanelProps = {
  slug: WorkshopSlug;
};

export function LabelPanel({ slug }: LabelPanelProps) {
  const [form, setForm] = useState<TemplateForm>({
    fontLarge: "160",
    fontSmall: "80",
    mediaSize: "3x2",
    showEmail: false,
    showWorkshop: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ w: slug });
      const res = await fetch(`/api/admin/label-template?${params}`);
      const data = (await res.json()) as {
        error?: string;
        template?: {
          fontLarge: number;
          fontSmall: number;
          mediaSize: string;
          showEmail: boolean;
          showWorkshop: boolean;
        };
      };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      const t = data.template;
      if (t) {
        setForm({
          fontLarge: String(t.fontLarge),
          fontSmall: String(t.fontSmall),
          mediaSize: t.mediaSize,
          showEmail: t.showEmail,
          showWorkshop: t.showWorkshop,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const fontLarge = Number.parseInt(form.fontLarge, 10);
      const fontSmall = Number.parseInt(form.fontSmall, 10);
      const res = await fetch("/api/admin/label-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workshop: slug,
          fontLarge: Number.isInteger(fontLarge) ? fontLarge : 160,
          fontSmall: Number.isInteger(fontSmall) ? fontSmall : 80,
          mediaSize: form.mediaSize.trim() || "3x2",
          showEmail: form.showEmail,
          showWorkshop: form.showWorkshop,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setSuccess("Plantilla guardada para este taller.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-brand-grey/20 bg-white p-4">
      <h3 className="text-sm font-semibold text-brand-ink">Etiqueta de impresión (Rollo)</h3>
      <p className="mt-1 text-xs text-brand-grey">
        Se imprime automáticamente en el primer check-in. La Mac con Impresora Auto
        debe tener <code className="text-[11px]">PRINT_AGENT_TOKEN</code> y{" "}
        <code className="text-[11px]">APP_BASE_URL</code> configurados.
      </p>

      {loading && (
        <p className="mt-3 text-sm text-brand-grey">Cargando plantilla…</p>
      )}

      {!loading && (
        <form onSubmit={(e) => void handleSave(e)} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-brand-charcoal">
              Fuente nombre (px)
              <input
                type="number"
                min={40}
                max={240}
                value={form.fontLarge}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fontLarge: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-brand-grey/30 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-brand-charcoal">
              Fuente apellido (px)
              <input
                type="number"
                min={20}
                max={120}
                value={form.fontSmall}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fontSmall: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-brand-grey/30 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-brand-charcoal">
            Tamaño papel CUPS
            <input
              type="text"
              value={form.mediaSize}
              onChange={(e) =>
                setForm((f) => ({ ...f, mediaSize: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-brand-grey/30 bg-white px-3 py-2 text-sm"
              placeholder="3x2"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-brand-charcoal">
            <input
              type="checkbox"
              checked={form.showEmail}
              onChange={(e) =>
                setForm((f) => ({ ...f, showEmail: e.target.checked }))
              }
              className="rounded border-brand-grey/40"
            />
            Mostrar email en etiqueta (línea extra)
          </label>

          <label className="flex items-center gap-2 text-sm text-brand-charcoal">
            <input
              type="checkbox"
              checked={form.showWorkshop}
              onChange={(e) =>
                setForm((f) => ({ ...f, showWorkshop: e.target.checked }))
              }
              className="rounded border-brand-grey/40"
            />
            Mostrar nombre del taller en etiqueta
          </label>

          <p className="text-xs text-brand-grey">
            Vista previa: primera línea = primer nombre (con * si el nombre lo
            trae), segunda = apellidos — igual que Impresora Auto.
          </p>

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
            disabled={saving}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar plantilla"}
          </button>
        </form>
      )}
    </section>
  );
}
