"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchLocalMacPrinter,
  type LocalMacPrinterInfo,
} from "@/lib/local-mac-printer";

type Props = {
  className?: string;
};

export function LocalMacPrinterStatus({ className = "" }: Props) {
  const [printer, setPrinter] = useState<LocalMacPrinterInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const info = await fetchLocalMacPrinter();
    setPrinter(info);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div
      className={`rounded-lg border border-brand-grey/20 bg-brand-off/60 px-3 py-2 text-xs text-brand-charcoal ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          <span className="font-semibold text-brand-slate">Impresora Mac:</span>{" "}
          {loading
            ? "Detectando…"
            : printer?.configured
              ? printer.name
              : "No detectada"}
          {!loading && printer?.configured && printer.offline ? (
            <span className="ml-1 font-medium text-amber-700">(offline)</span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="shrink-0 rounded-md border border-brand-grey/25 px-2 py-1 text-[11px] font-medium hover:bg-white/80"
        >
          Actualizar
        </button>
      </div>
      {!loading && !printer?.configured ? (
        <p className="mt-1 text-[11px] text-brand-grey">
          Configura la Rollo como predeterminada en macOS. Si usas Impresora Auto,
          deja el servicio local activo en el puerto 3000.
        </p>
      ) : null}
    </div>
  );
}
