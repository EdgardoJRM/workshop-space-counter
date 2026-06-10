export function PricingCard({
  badge,
  title,
  price,
  priceNote,
  description,
  items,
  highlighted = false,
}: {
  badge: string;
  title: string;
  price: string;
  priceNote: string;
  description: string;
  items: readonly string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={`flex h-full flex-col rounded-2xl p-5 sm:p-6 ${
        highlighted
          ? "border-2 border-[var(--terracotta)] bg-white shadow-lg shadow-[rgba(196,97,74,0.12)]"
          : "border border-[var(--border)] bg-white"
      }`}
    >
      <span className="mb-3 inline-block w-fit rounded-full bg-[var(--terracotta-pale)] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--terracotta)]">
        {badge}
      </span>
      <h3 className="font-display text-lg font-semibold text-[var(--charcoal)]">{title}</h3>
      <div className="mt-2 flex flex-wrap items-baseline gap-2">
        <span className="font-display text-3xl font-bold text-[var(--terracotta)]">{price}</span>
        <span className="text-xs text-[var(--charcoal-mid)]">{priceNote}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--charcoal-mid)]">{description}</p>
      <ul className="mt-4 flex-1 space-y-2 text-sm text-[var(--charcoal)]">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-[var(--terracotta)]">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
