"use client";

import { useCallback, useEffect, useState } from "react";

type WebhookInfo = {
  webhookUrl: string;
  secretConfigured: boolean;
};

const SAMPLE_PAYLOAD = {
  email: "cliente@ejemplo.com",
  name: "María Ejemplo",
  order_id: "cf-order-12345",
  workshop: "duplica-ventas",
};

export function WebhookPanel() {
  const [info, setInfo] = useState<WebhookInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/webhook-info");
      const data = (await res.json()) as WebhookInfo & { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setInfo(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("No se pudo copiar al portapapeles");
    }
  }

  const curlExample =
    info &&
    `curl -X POST '${info.webhookUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'X-Webhook-Secret: TU_SECRETO_EN_VERCEL' \\
  -d '${JSON.stringify(SAMPLE_PAYLOAD)}'`;

  const headerExample = "X-Webhook-Secret: <CLICKFUNNELS_WEBHOOK_SECRET>";

  return (
    <div className="mx-auto max-w-lg px-4 pb-12">
      <div className="rounded-2xl border border-brand-grey/30 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-slate">Webhook ClickFunnels</h2>

        {loading && <p className="mt-3 text-sm text-brand-grey">Cargando…</p>}
        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {info && (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-brand-charcoal">URL del webhook</p>
              <code className="mt-1 block break-all rounded-lg bg-brand-off/60 p-2 text-xs">
                {info.webhookUrl}
              </code>
              <button
                type="button"
                onClick={() => void copyText("url", info.webhookUrl)}
                className="mt-2 text-xs font-semibold text-brand-blue underline"
              >
                {copied === "url" ? "Copiado" : "Copiar URL"}
              </button>
            </div>

            <div>
              <p className="text-xs font-medium text-brand-charcoal">Secreto</p>
              {info.secretConfigured ? (
                <p className="mt-1 text-sm text-green-700">
                  CLICKFUNNELS_WEBHOOK_SECRET está configurado en el servidor.
                </p>
              ) : (
                <p className="mt-1 text-sm text-amber-700">
                  Falta CLICKFUNNELS_WEBHOOK_SECRET en Vercel. El webhook rechazará
                  peticiones hasta configurarlo.
                </p>
              )}
              <p className="mt-2 text-xs text-brand-grey">
                Header requerido (no mostramos el valor por seguridad):
              </p>
              <code className="mt-1 block break-all rounded-lg bg-brand-off/60 p-2 text-xs">
                {headerExample}
              </code>
              <button
                type="button"
                onClick={() => void copyText("header", headerExample)}
                className="mt-2 text-xs font-semibold text-brand-blue underline"
              >
                {copied === "header" ? "Copiado" : "Copiar header"}
              </button>
            </div>

            <div>
              <p className="text-xs font-medium text-brand-charcoal">Prueba con curl</p>
              <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-brand-charcoal p-3 text-xs text-white">
                {curlExample}
              </pre>
              <button
                type="button"
                onClick={() => curlExample && void copyText("curl", curlExample)}
                className="mt-2 text-xs font-semibold text-brand-blue underline"
              >
                {copied === "curl" ? "Copiado" : "Copiar curl"}
              </button>
            </div>

            <ol className="list-decimal space-y-2 pl-4 text-xs text-brand-charcoal">
              <li>En Vercel → Environment Variables, define CLICKFUNNELS_WEBHOOK_SECRET.</li>
              <li>En ClickFunnels, crea un webhook POST a la URL de arriba.</li>
              <li>Añade el header X-Webhook-Secret con el mismo valor del secreto.</li>
              <li>
                El JSON debe incluir al menos `email`; opcionalmente `name`, `order_id`,
                `workshop` (slug: duplica-ventas, canva, oferta-webinar).
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
