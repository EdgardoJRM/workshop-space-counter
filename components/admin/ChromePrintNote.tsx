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
        predeterminada de macOS (Rollo 3×2). Chrome la muestra en el diálogo al
        usar <strong>Probar label</strong> o en la estación web.
      </p>
      <p className="mt-1 text-[11px] text-brand-grey">
        No hace falta instalar nada en la Mac — solo Chrome, la Rollo conectada y
        esta pestaña abierta.
      </p>
    </div>
  );
}
