"use client";

import { useCallback, useEffect, useState } from "react";
import { ChromePrintNote } from "@/components/admin/ChromePrintNote";
import { isChromiumBrowser, printLabelPayload } from "@/lib/label-print-html";
import { WORKSHOPS, type WorkshopSlug } from "@/lib/workshop-keys";

type TemplateForm = {
  fontLarge: string;
  fontSmall: string;
  mediaSize: string;
  showEmail: boolean;
  showWorkshop: boolean;
};

const MEDIA_OPTIONS = [
  { value: "3x2", label: "3×2″ — rollo estándar (CUPS)" },
  { value: "w62h29", label: "62×29 mm" },
  { value: "w62h100", label: "62×100 mm" },
  { value: "w29h90", label: "29×90 mm" },
] as const;

async function readJsonResponse<T>(res: Response): Promise<T & { error?: string }> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    throw new Error(
      text.startsWith("<")
        ? `Error del servidor (${res.status}). Revisa la sesión o la base de datos.`
        : text.slice(0, 200) || `Error ${res.status}`
    );
  }
}

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
  const [previewBusy, setPreviewBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ w: slug });
      const res = await fetch(`/api/admin/label-template?${params}`);
      const data = await readJsonResponse<{
        template?: {
          fontLarge: number;
          fontSmall: number;
          mediaSize: string;
          showEmail: boolean;
          showWorkshop: boolean;
        };
      }>(res);
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

  function parseFormNumbers() {
    const fontLarge = Number.parseInt(form.fontLarge, 10);
    const fontSmall = Number.parseInt(form.fontSmall, 10);
    if (!Number.isInteger(fontLarge) || fontLarge < 40 || fontLarge > 240) {
      throw new Error("Fuente nombre: entero entre 40 y 240");
    }
    if (!Number.isInteger(fontSmall) || fontSmall < 20 || fontSmall > 120) {
      throw new Error("Fuente apellido: entero entre 20 y 120");
    }
    return { fontLarge, fontSmall };
  }

  async function handlePreviewPrint() {
    if (!isChromiumBrowser()) {
      setError("La vista previa requiere Google Chrome en la Mac del evento.");
      return;
    }

    setPreviewBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const { fontLarge, fontSmall } = parseFormNumbers();
      await printLabelPayload({
        name: "Prueba Impresora",
        email: "ejemplo@correo.com",
        workshopLabel: WORKSHOPS[slug].label,
        fontLarge,
        fontSmall,
        mediaSize: form.mediaSize.trim() || "3x2",
        showEmail: form.showEmail,
        showWorkshop: form.showWorkshop,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir la vista previa");
    } finally {
      setPreviewBusy(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { fontLarge, fontSmall } = parseFormNumbers();

      const res = await fetch("/api/admin/label-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workshop: slug,
          fontLarge,
          fontSmall,
          mediaSize: form.mediaSize.trim() || "3x2",
          showEmail: form.showEmail,
          showWorkshop: form.showWorkshop,
        }),
      });
      const data = await readJsonResponse<{ error?: string }>(res);
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
        En la Mac del evento usa <strong>Chrome</strong> (no Safari).{" "}
        <strong>Probar label</strong> abre el diálogo de impresión de macOS con vista
        previa PDF — ahí ves la impresora y confirmas fuentes antes de guardar. El
        día del evento deja la{" "}
        <a
          href="/staff/print-station"
          className="font-medium text-brand-slate underline"
          target="_blank"
          rel="noreferrer"
        >
          estación web
        </a>{" "}
        armada para imprimir check-ins solos.
      </p>

      <ChromePrintNote className="mt-3" />

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
            <select
              value={form.mediaSize}
              onChange={(e) =>
                setForm((f) => ({ ...f, mediaSize: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-brand-grey/30 bg-white px-3 py-2 text-sm"
            >
              {MEDIA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
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
            Primera línea = primer nombre (con * si el nombre lo trae), segunda =
            apellidos — igual que Impresora Auto.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={previewBusy}
              onClick={() => void handlePreviewPrint()}
              className="rounded-lg border border-brand-grey/30 px-4 py-2 text-sm font-semibold text-brand-charcoal disabled:opacity-50"
            >
              {previewBusy ? "Abriendo vista previa…" : "Probar label"}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar plantilla"}
            </button>
          </div>

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
        </form>
      )}
    </section>
  );
}
