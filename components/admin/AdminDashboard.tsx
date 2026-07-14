"use client";

import { useEffect, useState } from "react";
import { SpacesForm } from "@/components/admin/SpacesForm";
import { RegistrationsPanel } from "@/components/admin/RegistrationsPanel";
import { DatesPanel } from "@/components/admin/DatesPanel";
import { WebhookPanel } from "@/components/admin/WebhookPanel";
import { EmailSequencePanel } from "@/components/admin/EmailSequencePanel";
import { LabelPanel } from "@/components/admin/LabelPanel";
import { PrinterPairingPanel } from "@/components/admin/PrinterPairingPanel";
import { PendingPurchasesPanel } from "@/components/admin/PendingPurchasesPanel";
import { GuestInfoRequestsPanel } from "@/components/admin/GuestInfoRequestsPanel";
import { AdminOverview } from "@/components/admin/AdminOverview";
import {
  ADMIN_NAV,
  getViewMeta,
  viewNeedsWorkshop,
  type AdminView,
} from "@/components/admin/admin-types";
import { WORKSHOPS, type WorkshopSlug } from "@/lib/workshop-keys";

const TAB_ORDER: WorkshopSlug[] = [
  "duplica-ventas",
  "canva",
  "oferta-webinar",
];

type SessionInfo = {
  email: string;
  roles: string[];
};

function NavButton({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
        active
          ? "bg-brand-slate text-white shadow-md"
          : "bg-white/80 text-brand-charcoal hover:bg-white"
      }`}
    >
      <span className="block text-sm font-semibold">{label}</span>
      <span
        className={`mt-0.5 block text-xs ${
          active ? "text-white/80" : "text-brand-grey"
        }`}
      >
        {description}
      </span>
    </button>
  );
}

export function AdminDashboard() {
  const [active, setActive] = useState<WorkshopSlug>("duplica-ventas");
  const [view, setView] = useState<AdminView>("home");
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

  function navigate(next: AdminView, workshop?: WorkshopSlug) {
    if (workshop) setActive(workshop);
    setView(next);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login?intent=admin";
  }

  const meta = getViewMeta(view);
  const workshopNav = ADMIN_NAV.filter((n) => n.group === "workshop");
  const systemNav = ADMIN_NAV.filter((n) => n.group === "system");
  const showWorkshopPicker = viewNeedsWorkshop(view);

  return (
    <div className="min-h-screen bg-brand-off/40">
      <header className="border-b border-brand-grey/20 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
              Hernandez Pass
            </p>
            <h1 className="text-xl font-semibold text-brand-slate">
              Centro de configuración
            </h1>
            {session && (
              <p className="mt-0.5 text-xs text-brand-grey">{session.email}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="shrink-0 rounded-lg border border-brand-grey/30 px-3 py-2 text-xs font-semibold text-brand-charcoal"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <nav className="space-y-1" aria-label="Navegación principal">
            <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-brand-grey">
              Taller
            </p>
            {workshopNav.map((item) => (
              <NavButton
                key={item.id}
                active={view === item.id}
                label={item.label}
                description={item.description}
                onClick={() => setView(item.id)}
              />
            ))}
          </nav>

          <nav className="space-y-1" aria-label="Configuración del sistema">
            <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-brand-grey">
              Sistema
            </p>
            {systemNav.map((item) => (
              <NavButton
                key={item.id}
                active={view === item.id}
                label={item.label}
                description={item.description}
                onClick={() => setView(item.id)}
              />
            ))}
          </nav>

          <p className="hidden pt-2 text-center text-xs text-brand-grey lg:block">
            <a href="/staff/scan" className="text-brand-blue underline">
              Scanner staff
            </a>
          </p>
        </aside>

        <main className="min-w-0">
          {view !== "home" && (
            <div className="mb-4 rounded-xl border border-brand-grey/20 bg-white/80 px-4 py-3">
              <h2 className="text-lg font-semibold text-brand-slate">{meta.title}</h2>
              <p className="text-sm text-brand-charcoal">{meta.description}</p>
            </div>
          )}

          {showWorkshopPicker && (
            <div
              className="mb-4 flex flex-wrap gap-2"
              role="tablist"
              aria-label="Seleccionar taller"
            >
              {TAB_ORDER.map((slug) => (
                <button
                  key={slug}
                  type="button"
                  role="tab"
                  aria-selected={active === slug}
                  onClick={() => setActive(slug)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active === slug
                      ? "bg-brand-gold text-brand-ink shadow-sm"
                      : "bg-white text-brand-charcoal ring-1 ring-brand-grey/25"
                  }`}
                >
                  {WORKSHOPS[slug].label}
                </button>
              ))}
            </div>
          )}

          <div className="pb-12">
            {view === "home" && <AdminOverview onNavigate={navigate} />}

            {view === "printer" && <PrinterPairingPanel />}
            {view === "pending-purchases" && <PendingPurchasesPanel />}
            {view === "guest-info" && <GuestInfoRequestsPanel />}
            {view === "webhook" && <WebhookPanel />}
            {view === "emails" && <EmailSequencePanel />}

            {TAB_ORDER.map((slug) => (
              <div key={slug} hidden={active !== slug}>
                {active === slug && view === "spaces" && (
                  <SpacesForm slug={slug} embedded />
                )}
                {active === slug && view === "registrations" && (
                  <RegistrationsPanel slug={slug} />
                )}
                {active === slug && view === "dates" && <DatesPanel slug={slug} />}
                {active === slug && view === "labels" && <LabelPanel slug={slug} />}
              </div>
            ))}
          </div>

          <p className="pb-6 text-center text-xs text-brand-grey lg:hidden">
            <a href="/staff/scan" className="text-brand-blue underline">
              Abrir scanner staff
            </a>
          </p>
        </main>
      </div>
    </div>
  );
}
