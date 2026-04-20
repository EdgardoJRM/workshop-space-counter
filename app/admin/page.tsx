"use client";

import { useState } from "react";
import { SpacesForm } from "@/components/admin/SpacesForm";
import { WORKSHOPS, type WorkshopSlug } from "@/lib/workshop-keys";

const TAB_ORDER: WorkshopSlug[] = ["duplica-ventas", "canva"];

export default function AdminPage() {
  const [active, setActive] = useState<WorkshopSlug>("duplica-ventas");

  return (
    <div className="min-h-screen bg-brand-off/40">
      <div className="mx-auto max-w-lg px-4 pt-8 pb-4">
        <div
          className="flex flex-wrap justify-center gap-2"
          role="tablist"
          aria-label="Seleccionar taller"
        >
          {TAB_ORDER.map((slug) => {
            const selected = active === slug;
            return (
              <button
                key={slug}
                type="button"
                role="tab"
                id={`tab-${slug}`}
                aria-selected={selected}
                aria-controls={`panel-${slug}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(slug)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 ${
                  selected
                    ? "bg-brand-slate text-white shadow-md"
                    : "bg-brand-off text-brand-charcoal hover:bg-brand-grey/20"
                }`}
              >
                {WORKSHOPS[slug].label}
              </button>
            );
          })}
        </div>
      </div>

      {TAB_ORDER.map((slug) => (
        <div
          key={slug}
          id={`panel-${slug}`}
          role="tabpanel"
          aria-labelledby={`tab-${slug}`}
          hidden={active !== slug}
        >
          {active === slug ? <SpacesForm slug={slug} /> : null}
        </div>
      ))}
    </div>
  );
}
