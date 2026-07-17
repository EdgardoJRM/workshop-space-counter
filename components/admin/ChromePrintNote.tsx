"use client";

type Props = {
  className?: string;
};

/** Impresión 100% web: Chrome + impresora predeterminada de macOS. Sin app local. */
export function ChromePrintNote({ className = "" }: Props) {
  return (
    <div
      className={`rounded-lg border border-brand-grey/20 bg-brand-off/60 px-3 py-2 text-xs text-brand-charcoal ${className}`}
    >
      <p>
        <span className="font-semibold text-brand-slate">Impresora:</span> la
        predeterminada de macOS (Rollo 3×2). <strong>Probar label</strong> imprime
        ahí directo desde Chrome.
      </p>
      <p className="mt-1 text-[11px] text-brand-grey">
        Para imprimir sin diálogo el día del evento, abre Chrome con{" "}
        <code className="text-[10px]">--kiosk-printing</code>. Sin eso, macOS pide
        confirmar una vez en Imprimir.
      </p>
    </div>
  );
}
