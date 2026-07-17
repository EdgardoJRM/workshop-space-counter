"use client";

import { useState } from "react";
import type { WorkshopSlug } from "@/lib/workshop-keys";

type ImportResult = {
  ok?: boolean;
  error?: string;
  parseErrors?: { row: number; message: string }[];
  created?: number;
  duplicates?: number;
  failed?: number;
  results?: {
    row: number;
    email: string;
    ok: boolean;
    duplicate?: boolean;
    error?: string;
  }[];
};

export type CsvImportPanelProps = {
  slug: WorkshopSlug;
  workshopDateId: string;
  onImported: () => void;
};

const SAMPLE_CSV = `nombre,email,telefono
María García,maria@ejemplo.com,7875551234
Juan Pérez,juan@ejemplo.com,9395559876`;

export function CsvImportPanel({ slug, workshopDateId, onImported }: CsvImportPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showSample, setShowSample] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Selecciona un archivo CSV.");
      return;
    }

    if (!workshopDateId) {
      setError("Elige una fecha del evento antes de importar.");
      return;
    }

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("workshop", slug);
      form.append("workshopDateId", workshopDateId);
      form.append("sendPassEmail", sendEmail ? "true" : "false");

      const res = await fetch("/api/admin/import-registrations", {
        method: "POST",
        body: form,
      });

      const data = (await res.json()) as ImportResult;
      if (!res.ok) {
        throw new Error(data.error ?? `Error ${res.status}`);
      }

      setResult(data);
      if ((data.created ?? 0) > 0) {
        onImported();
      }
      setFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setImporting(false);
    }
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-registros.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mb-6 rounded-2xl border border-brand-blue/25 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-brand-slate">Importar desde CSV</h3>
      <p className="mt-1 text-xs text-brand-charcoal">
        Columnas: <strong>nombre</strong>, <strong>email</strong>, <strong>telefono</strong>{" "}
        (primera fila = encabezados). Se importa a la <strong>fecha seleccionada</strong> arriba.
        Máximo 500 filas.
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowSample((v) => !v)}
          className="text-xs text-brand-blue underline"
        >
          {showSample ? "Ocultar ejemplo" : "Ver ejemplo"}
        </button>
        <button
          type="button"
          onClick={downloadSample}
          className="text-xs text-brand-blue underline"
        >
          Descargar plantilla
        </button>
      </div>

      {showSample && (
        <pre className="mt-2 overflow-x-auto rounded-lg bg-brand-off/80 p-2 text-xs">
          {SAMPLE_CSV}
        </pre>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-brand-charcoal file:mr-3 file:rounded-lg file:border-0 file:bg-brand-gold file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-ink"
        />
        <label className="flex items-center gap-2 text-xs text-brand-charcoal">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
          />
          Enviar email con pase QR al importar
        </label>
        <button
          type="submit"
          disabled={importing || !file}
          className="w-full rounded-lg bg-brand-slate py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {importing ? "Importando…" : "Importar CSV"}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 rounded-xl border border-brand-grey/20 bg-brand-off/40 p-3 text-sm">
          <p className="font-semibold text-brand-slate">Resultado</p>
          <p className="mt-1 text-brand-charcoal">
            {result.created ?? 0} nuevos · {result.duplicates ?? 0} ya registrados ·{" "}
            {result.failed ?? 0} fallidos
          </p>
          {(result.parseErrors?.length ?? 0) > 0 && (
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-amber-800">
              {result.parseErrors!.map((pe) => (
                <li key={`p-${pe.row}`}>
                  Fila {pe.row}: {pe.message}
                </li>
              ))}
            </ul>
          )}
          {(result.results?.filter((r) => !r.ok).length ?? 0) > 0 && (
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-red-700">
              {result.results!
                .filter((r) => !r.ok)
                .slice(0, 20)
                .map((r) => (
                  <li key={`f-${r.row}`}>
                    Fila {r.row} ({r.email}): {r.error}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
