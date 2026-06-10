import { useEffect, useState } from "react";
import { NAV_SECTIONS } from "../data/content";

export function SiteNav() {
  const [active, setActive] = useState(NAV_SECTIONS[0].id);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const sections = NAV_SECTIONS.map((s) => document.getElementById(s.id)).filter(
      Boolean,
    ) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.25, 0.5] },
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const navButton = (id: string, label: string, compact = false) => (
    <button
      key={id}
      type="button"
      onClick={() => scrollTo(id)}
      className={`w-full cursor-pointer border-none bg-transparent text-left transition ${
        compact ? "px-3 py-2.5 text-sm" : "border-l-[2.5px] py-1.5 pl-3.5 text-[0.78rem]"
      } ${
        active === id
          ? "border-[var(--terracotta)] font-bold text-[var(--terracotta)]"
          : "border-transparent font-normal text-[var(--charcoal-mid)] hover:text-[var(--charcoal)]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 border-r border-[var(--border)] bg-[var(--cream)]/95 backdrop-blur lg:block xl:w-60">
        <div className="flex h-full flex-col overflow-y-auto px-5 pb-8 pt-8">
          <div className="mb-6">
            <div className="font-display text-xs uppercase tracking-[0.1em] text-[var(--terracotta)]">
              Propuesta
            </div>
            <div className="text-xs text-[var(--charcoal-mid)]">San Patricio Social</div>
          </div>
          <nav className="flex flex-col gap-0.5">
            {NAV_SECTIONS.map(({ id, label }) => navButton(id, label))}
          </nav>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)] bg-[var(--cream)]/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <div className="truncate font-display text-[0.7rem] uppercase tracking-[0.1em] text-[var(--terracotta)]">
              San Patricio Social
            </div>
            <div className="truncate text-[0.65rem] text-[var(--charcoal-mid)]">
              Propuesta Comercial
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="shrink-0 cursor-pointer rounded-full border-none bg-[var(--terracotta)] px-4 py-2 text-xs font-bold text-white shadow-md"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {menuOpen ? "✕ Cerrar" : "≡ Menú"}
          </button>
        </div>
        {menuOpen && (
          <nav className="max-h-[min(70vh,28rem)] overflow-y-auto border-t border-[var(--border)] bg-white px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {NAV_SECTIONS.map(({ id, label }) => navButton(id, label, true))}
          </nav>
        )}
      </header>
    </>
  );
}
