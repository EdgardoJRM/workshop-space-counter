"use client";

import { CHROME_KIOSK_OPEN_COMMAND } from "@/lib/print-station-url";

type Props = {
  className?: string;
  showKioskCommand?: boolean;
};

/** Impresión 100% web: Chrome + impresora predeterminada de macOS. Sin app local. */
export function ChromePrintNote({
  className = "",
  showKioskCommand = false,
}: Props) {
  return (
    <div
      className={`rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-xs text-amber-950 ${className}`}
    >
      <p className="font-semibold text-amber-900">
        Chrome debe abrirse con <code className="text-[10px]">--kiosk-printing</code>
      </p>
      <p className="mt-1">
        Si abriste la URL con el botón del admin o pegándola a mano, macOS{" "}
        <strong>siempre</strong> muestra el diálogo de impresión y el tamaño puede salir
        como Letter (página completa) aunque el label sea 3×2″.
      </p>
      <p className="mt-1 text-[11px] text-amber-900/90">
        En la Mac de la Rollo: cierra Chrome por completo → Terminal → pega el comando
        kiosk → login staff → deja la estación <strong>Armada</strong> → Probar label.
      </p>
      {showKioskCommand ? (
        <pre className="mt-2 overflow-x-auto rounded bg-white/80 p-2 text-[10px] text-brand-ink">
          {CHROME_KIOSK_OPEN_COMMAND}
        </pre>
      ) : (
        <p className="mt-1 text-[11px] text-amber-900/80">
          Rollo = impresora predeterminada en macOS (3×2″). El comando kiosk está en el
          setup de la estación y en Admin → Impresora.
        </p>
      )}
    </div>
  );
}
