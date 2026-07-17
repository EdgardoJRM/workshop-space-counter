"use client";

import {
  ROLLO_PRINT_RELAY_ZIP_NAME,
  ROLLO_PRINT_RELAY_ZIP_PATH,
} from "@/lib/rollo-print-download";

type Props = {
  className?: string;
  variant?: "banner" | "inline";
};

export function RolloPrintDownloadBlock({
  className = "",
  variant = "banner",
}: Props) {
  if (variant === "inline") {
    return (
      <a
        href={ROLLO_PRINT_RELAY_ZIP_PATH}
        download={ROLLO_PRINT_RELAY_ZIP_NAME}
        className={`inline-flex items-center justify-center rounded-lg bg-brand-slate px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-slate/90 ${className}`}
      >
        Descargar relay Rollo (Mac)
      </a>
    );
  }

  return (
    <div
      className={`rounded-xl border border-brand-slate/25 bg-brand-slate/5 p-4 ${className}`}
    >
      <p className="text-sm font-semibold text-brand-ink">
        Paso 1 — Instala el relay en esta Mac
      </p>
      <p className="mt-1 text-xs text-brand-grey">
        No necesitas el proyecto ni npm. Descarga el zip, descomprímelo y abre{" "}
        <strong>Iniciar-Rollo.command</strong>. Deja Terminal abierta.
      </p>
      <a
        href={ROLLO_PRINT_RELAY_ZIP_PATH}
        download={ROLLO_PRINT_RELAY_ZIP_NAME}
        className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-brand-slate px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-slate/90 sm:w-auto"
      >
        Descargar relay Rollo (Mac)
      </a>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-brand-grey">
        <li>Descomprime en el Escritorio.</li>
        <li>
          Doble clic en <code className="text-[10px]">Iniciar-Rollo.command</code>{" "}
          (si macOS bloquea: clic derecho → Abrir).
        </li>
        <li>
          Recarga esta página — debe aparecer el mensaje verde de impresión local.
        </li>
      </ol>
    </div>
  );
}
