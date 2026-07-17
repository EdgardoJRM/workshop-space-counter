"use client";

import { useMemo } from "react";
import {
  CHROME_KIOSK_OPEN_COMMAND,
  PRINT_STATION_PRODUCTION_URL,
  printStationUrl,
} from "@/lib/print-station-url";
import {
  ROLLO_PRINT_RELAY_ZIP_NAME,
  ROLLO_PRINT_RELAY_ZIP_PATH,
} from "@/lib/rollo-print-download";

type Props = {
  className?: string;
};

export function PrintStationLinkBlock({ className = "" }: Props) {
  const stationUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      return printStationUrl(window.location.origin);
    }
    return PRINT_STATION_PRODUCTION_URL;
  }, []);

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  return (
    <div className={className}>
      <a
        href={stationUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-block rounded-lg bg-brand-slate px-4 py-2 text-sm font-medium text-white"
      >
        Abrir estación de impresión
      </a>
      <a
        href={ROLLO_PRINT_RELAY_ZIP_PATH}
        download={ROLLO_PRINT_RELAY_ZIP_NAME}
        className="ml-2 inline-block rounded-lg border border-brand-slate/30 px-4 py-2 text-sm font-medium text-brand-slate"
      >
        Descargar relay Rollo (Mac)
      </a>
      <p className="mt-3 text-xs text-brand-grey">
        Si el comando de Terminal no abre la URL, pégala en Chrome:
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="break-all rounded bg-brand-off px-2 py-1 text-[11px] text-brand-ink">
          {stationUrl}
        </code>
        <button
          type="button"
          onClick={() => void copyText(stationUrl)}
          className="rounded border border-brand-grey/30 px-2 py-1 text-[11px] font-medium"
        >
          Copiar URL
        </button>
      </div>
      <p className="mt-3 text-xs text-brand-grey">
        Kiosk en Mac (fuerza ventana nueva):
      </p>
      <pre className="mt-1 overflow-x-auto rounded-lg bg-brand-off p-3 text-[11px] text-brand-ink">
        {CHROME_KIOSK_OPEN_COMMAND}
      </pre>
      <button
        type="button"
        onClick={() => void copyText(CHROME_KIOSK_OPEN_COMMAND)}
        className="mt-2 rounded border border-brand-grey/30 px-2 py-1 text-[11px] font-medium"
      >
        Copiar comando
      </button>
    </div>
  );
}
