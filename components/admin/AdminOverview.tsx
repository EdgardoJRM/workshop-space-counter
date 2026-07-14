"use client";

import { useEffect, useState } from "react";
import { WORKSHOPS, type WorkshopSlug } from "@/lib/workshop-keys";
import type { AdminView } from "@/components/admin/admin-types";

type DateSummary = {
  id: string;
  title: string;
  startsAt: string;
  isActive: boolean;
  isSelling: boolean;
  available: number;
  soldCount: number;
};

type Props = {
  onNavigate: (view: AdminView, workshop?: WorkshopSlug) => void;
};

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AdminOverview({ onNavigate }: Props) {
  const [webhookOk, setWebhookOk] = useState<boolean | null>(null);
  const [emailCount, setEmailCount] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [guestCount, setGuestCount] = useState<number | null>(null);
  const [workshopDates, setWorkshopDates] = useState<
    Record<string, DateSummary | null>
  >({});

  useEffect(() => {
    void (async () => {
      try {
        const [wh, em, pending, guests, ...dateResults] = await Promise.all([
          fetch("/api/admin/webhook-info").then((r) => r.json()),
          fetch("/api/admin/email-templates").then((r) => r.json()),
          fetch("/api/admin/pending-purchases").then((r) => r.json()),
          fetch("/api/admin/guest-info-requests").then((r) => r.json()),
          ...Object.keys(WORKSHOPS).map((slug) =>
            fetch(`/api/admin/dates?w=${slug}`)
              .then((r) => r.json())
              .then((data: { dates?: DateSummary[] }) => {
                const selling =
                  data.dates?.find((d) => d.isSelling) ??
                  data.dates?.find((d) => d.isActive) ??
                  data.dates?.[0];
                return { slug, active: selling ?? null };
              })
          ),
        ]);

        setWebhookOk(Boolean((wh as { secretConfigured?: boolean }).secretConfigured));
        setEmailCount(
          ((em as { templates?: unknown[] }).templates ?? []).length
        );
        setPendingCount((pending as { count?: number }).count ?? 0);
        setGuestCount((guests as { count?: number }).count ?? 0);

        const map: Record<string, DateSummary | null> = {};
        for (const r of dateResults as { slug: string; active: DateSummary | null }[]) {
          map[r.slug] = r.active;
        }
        setWorkshopDates(map);
      } catch {
        setWebhookOk(null);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-brand-slate">Inicio</h2>
        <p className="mt-1 text-sm text-brand-charcoal">
          Configura fechas, webhook de ClickFunnels, cupos y emails desde el menú
          lateral. Todo lo que antes solo estaba en variables de entorno ahora puedes
          gestionarlo aquí.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onNavigate("webhook")}
          className="rounded-xl border border-brand-grey/25 bg-white p-4 text-left shadow-sm transition hover:border-brand-blue/40"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
            Sistema
          </p>
          <p className="mt-1 font-semibold text-brand-slate">Webhook ClickFunnels</p>
          <p className="mt-2 text-sm text-brand-charcoal">
            URL y header para conectar la compra con Hernandez Pass.
          </p>
          <p className="mt-2 text-xs font-medium">
            {webhookOk === null && "Cargando…"}
            {webhookOk === true && (
              <span className="text-green-700">Secreto configurado en servidor</span>
            )}
            {webhookOk === false && (
              <span className="text-amber-700">Falta CLICKFUNNELS_WEBHOOK_SECRET</span>
            )}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("emails")}
          className="rounded-xl border border-brand-grey/25 bg-white p-4 text-left shadow-sm transition hover:border-brand-blue/40"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
            Sistema
          </p>
          <p className="mt-1 font-semibold text-brand-slate">Emails automáticos</p>
          <p className="mt-2 text-sm text-brand-charcoal">
            Plantillas que se envían X horas después del evento.
          </p>
          <p className="mt-2 text-xs font-medium text-brand-grey">
            {emailCount === null
              ? "Cargando…"
              : `${emailCount} plantilla${emailCount === 1 ? "" : "s"}`}
          </p>
        </button>

        {(pendingCount ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => onNavigate("pending-purchases")}
            className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-left shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Atención
            </p>
            <p className="mt-1 font-semibold text-brand-slate">
              {pendingCount} compra(s) sin asignar
            </p>
            <p className="mt-2 text-sm text-brand-charcoal">
              Revisa y asigna taller, o corrige la URL del webhook en ClickFunnels.
            </p>
          </button>
        )}

        {(guestCount ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => onNavigate("guest-info")}
            className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-left shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Atención
            </p>
            <p className="mt-1 font-semibold text-brand-slate">
              {guestCount} invitado(s) pendientes
            </p>
            <p className="mt-2 text-sm text-brand-charcoal">
              Compradores con boletos extra que no completaron el formulario.
            </p>
          </button>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-brand-slate">Por taller</h3>
        <ul className="mt-3 space-y-3">
          {(Object.keys(WORKSHOPS) as WorkshopSlug[]).map((slug) => {
            const label = WORKSHOPS[slug].label;
            const d = workshopDates[slug];
            return (
              <li
                key={slug}
                className="rounded-xl border border-brand-grey/25 bg-white p-4 shadow-sm"
              >
                <p className="font-semibold text-brand-charcoal">{label}</p>
                {d ? (
                  <p className="mt-1 text-sm text-brand-grey">
                    {d.isSelling ? "En venta: " : d.isActive ? "Evento de hoy: " : "Próxima fecha: "}
                    <span className="text-brand-charcoal">{d.title}</span>
                    {" · "}
                    {formatWhen(d.startsAt)}
                    {" · "}
                    {d.available} cupos libres
                    {d.isSelling && d.isActive ? " · también evento de hoy" : ""}
                    {!d.isSelling && d.isActive ? " · sin fecha en venta" : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-amber-700">
                    Sin fechas — créala en Fechas
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate("dates", slug)}
                    className="rounded-lg bg-brand-off px-3 py-1.5 text-xs font-semibold text-brand-charcoal"
                  >
                    Fechas
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate("spaces", slug)}
                    className="rounded-lg bg-brand-off px-3 py-1.5 text-xs font-semibold text-brand-charcoal"
                  >
                    Cupos
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate("registrations", slug)}
                    className="rounded-lg bg-brand-off px-3 py-1.5 text-xs font-semibold text-brand-charcoal"
                  >
                    Registros
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate("labels", slug)}
                    className="rounded-lg bg-brand-off px-3 py-1.5 text-xs font-semibold text-brand-charcoal"
                  >
                    Labels
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
