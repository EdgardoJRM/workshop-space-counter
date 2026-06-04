"use client";

import { useEffect, useState } from "react";
import { SpacesForm } from "@/components/admin/SpacesForm";
import { RegistrationsPanel } from "@/components/admin/RegistrationsPanel";
import { DatesPanel } from "@/components/admin/DatesPanel";
import { WebhookPanel } from "@/components/admin/WebhookPanel";
import { EmailSequencePanel } from "@/components/admin/EmailSequencePanel";
import { WORKSHOPS, type WorkshopSlug } from "@/lib/workshop-keys";

const TAB_ORDER: WorkshopSlug[] = [
  "duplica-ventas",
  "canva",
  "oferta-webinar",
];

type AdminView =
  | "spaces"
  | "registrations"
  | "dates"
  | "webhook"
  | "emails";

type SessionInfo = {
  email: string;
  roles: string[];
};

export function AdminDashboard() {
  const [active, setActive] = useState<WorkshopSlug>("duplica-ventas");
  const [view, setView] = useState<AdminView>("spaces");
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    void fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.authenticated) {
          setSession({ email: data.email, roles: data.roles });
        }
      })
      .catch(() => undefined);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login?intent=admin";
  }

  return (
    <div className="min-h-screen bg-brand-off/40">
      <div className="mx-auto max-w-lg px-4 pt-6 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
              Hernandez Pass
            </p>
            <h1 className="text-lg font-semibold text-brand-slate">
              Panel administrativo
            </h1>
            {session && (
              <p className="mt-1 text-xs text-brand-grey">{session.email}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="text-xs text-brand-charcoal underline"
          >
            Salir
          </button>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {(
            [
              ["spaces", "Cupos"],
              ["registrations", "Registros"],
              ["dates", "Fechas"],
              ["webhook", "Webhook"],
              ["emails", "Emails"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                view === key
                  ? "bg-brand-slate text-white"
                  : "bg-white text-brand-charcoal"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          className="mt-4 flex flex-wrap justify-center gap-2"
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
                aria-selected={selected}
                onClick={() => setActive(slug)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
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

      {view === "webhook" && <WebhookPanel />}
      {view === "emails" && <EmailSequencePanel />}

      {TAB_ORDER.map((slug) => (
        <div key={slug} hidden={active !== slug}>
          {active === slug && view === "spaces" && <SpacesForm slug={slug} />}
          {active === slug && view === "registrations" && (
            <div className="mx-auto max-w-lg px-4 pb-12">
              <RegistrationsPanel slug={slug} />
            </div>
          )}
          {active === slug && view === "dates" && <DatesPanel slug={slug} />}
        </div>
      ))}

      <p className="pb-8 text-center text-xs text-brand-grey">
        <a href="/staff/scan" className="text-brand-blue underline">
          Abrir scanner staff
        </a>
      </p>
    </div>
  );
}
