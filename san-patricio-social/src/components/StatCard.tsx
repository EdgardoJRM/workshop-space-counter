export function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border-l-[3px] border-[var(--terracotta)] bg-[var(--cream-dark)] p-4 sm:p-5">
      <div className="font-display text-[clamp(1.75rem,5vw,2.2rem)] font-semibold leading-none text-[var(--terracotta)]">
        {value}
      </div>
      <p className="mt-2 text-[0.8rem] leading-relaxed text-[var(--charcoal-mid)] sm:text-sm">
        {label}
      </p>
    </div>
  );
}
