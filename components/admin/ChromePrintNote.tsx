"use client";

import { CHROME_KIOSK_OPEN_COMMAND } from "@/lib/print-station-url";

type Props = {
  className?: string;
  showKioskCommand?: boolean;
};

/** Impresión en Mac del evento: relay local lp + Chrome estación. */
export function ChromePrintNote({
  className = "",
  showKioskCommand = false,
}: Props) {
  return (
    <div
      className={`rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-xs text-amber-950 ${className}`}
    >
      <p className="font-semibold text-amber-900">
        En la Mac de la Rollo descarga e instala el relay desde la estación de impresión
      </p>
      <p className="mt-1">
        En <strong>/staff/print-station</strong> hay un zip para Mac (sin npm). Eso manda el
        label a CUPS con tamaño <strong>3×2″</strong> (1 label por job). Solo con Chrome, la
        Rollo suele avanzar 3 labels o imprimir Letter.
      </p>
      <p className="mt-1 text-[11px] text-amber-900/90">
        Luego abre Chrome con kiosk, login staff, estación <strong>Armada</strong>, Probar
        label.
      </p>
      {showKioskCommand ? (
        <pre className="mt-2 overflow-x-auto rounded bg-white/80 p-2 text-[10px] text-brand-ink">
          {CHROME_KIOSK_OPEN_COMMAND}
        </pre>
      ) : null}
    </div>
  );
}
