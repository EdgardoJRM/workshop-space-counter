import type { ReactNode } from "react";

export function SectionHeader({
  num,
  label,
  title,
  children,
}: {
  num: string;
  label: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 md:mb-8">
      <div className="mb-4 flex items-center gap-3">
        <span className="font-display text-[0.65rem] uppercase tracking-[0.14em] text-[var(--terracotta)] sm:text-xs">
          {num}
        </span>
        <div className="h-px w-8 rounded bg-[var(--terracotta)]" />
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--terracotta)] sm:text-xs">
          {label}
        </span>
      </div>
      <h2 className="font-display text-[clamp(1.6rem,5vw,2.4rem)] font-semibold leading-tight text-[var(--charcoal)]">
        {title}
      </h2>
      {children}
    </div>
  );
}
