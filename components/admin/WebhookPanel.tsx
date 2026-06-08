"use client";

import { useCallback, useEffect, useState } from "react";

type WebhookInfo = {
  webhookUrl: string;
  secretConfigured: boolean;
  secretSource: "org" | "env" | null;
  organizationSlug: string;
};

type WebhookTestResult = {
  ok: boolean;
  status: number;
  message: string;
  response?: unknown;
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
  const [secretInput, setSecretInput] = useState("");
  const [savingSecret, setSavingSecret] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<WebhookTestResult | null>(null);

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

  async function saveSecret() {
    const trimmed = secretInput.trim();
    if (!trimmed) {
      setError("Pega el webhook secret de ClickFunnels");
      return;
    }

    setSavingSecret(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/webhook-info", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clickfunnelsSecret: trimmed }),
      });
      const data = (await res.json()) as WebhookInfo & { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setInfo(data);
      setSecretInput("");
      setTestResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el secreto");
    } finally {
      setSavingSecret(false);
    }
  }

  async function runTest() {
    setTesting(true);
    setError(null);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/webhook-info", { method: "POST" });
      const data = (await res.json()) as WebhookTestResult & { error?: string };
      if (!res.ok && !data.status) {
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      setTestResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo probar el webhook");
    } finally {
      setTesting(false);
    }
  }

  const curlExample =
    info &&
    `curl -X POST '${info.webhookUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'X-Webhook-Secret: TU_SECRETO_EN_VERCEL' \\
  -d '${JSON.stringify(SAMPLE_PAYLOAD)}'`;

  const headerExample =
    "ClickFunnels V2 firma automáticamente (X-Webhook-ClickFunnels-Signature). Para pruebas manuales: X-Webhook-Secret";

  const secretSourceLabel =
    info?.secretSource === "org"
      ? "base de datos (Organization.clickfunnelsSecret)"
      : info?.secretSource === "env"
        ? "variable de entorno (CLICKFUNNELS_WEBHOOK_SECRET)"
        : null;

  return (
    <div className="pb-4">
      <div className="rounded-2xl border border-brand-grey/30 bg-white p-4 shadow-sm">

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
                  Secreto configurado
                  {secretSourceLabel ? ` — fuente: ${secretSourceLabel}` : ""}.
                </p>
              ) : (
                <p className="mt-1 text-sm text-amber-700">
                  Falta CLICKFUNNELS_WEBHOOK_SECRET en Vercel. El webhook rechazará
                  peticiones hasta configurarlo.
                </p>
              )}
              <p className="mt-2 text-xs text-brand-grey">
                Si rotas el secret en ClickFunnels, actualiza Vercel y la base de datos.
                Si Vercel y la DB difieren, el servidor usa el valor de Vercel y sincroniza
                la DB automáticamente.
              </p>
              <label className="mt-3 block text-xs font-medium text-brand-charcoal">
                Pegar webhook secret de ClickFunnels (guarda en DB)
              </label>
              <input
                type="password"
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                placeholder="webhook secret del endpoint en CF"
                className="mt-1 w-full rounded-lg border border-brand-grey/40 px-3 py-2 text-sm"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => void saveSecret()}
                disabled={savingSecret || !secretInput.trim()}
                className="mt-2 rounded-lg bg-brand-charcoal px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {savingSecret ? "Guardando…" : "Guardar secreto en DB"}
              </button>
              <p className="mt-2 text-xs text-brand-grey">
                También pon el mismo valor en Vercel como{" "}
                <code className="text-[11px]">CLICKFUNNELS_WEBHOOK_SECRET</code> y
                redeploy.
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-brand-charcoal">Probar webhook</p>
              <p className="mt-1 text-xs text-brand-grey">
                Envía un POST de prueba con el secreto configurado. 401 = secreto mal;
                422 = auth OK pero falta fecha activa del taller.
              </p>
              <button
                type="button"
                onClick={() => void runTest()}
                disabled={testing || !info.secretConfigured}
                className="mt-2 rounded-lg bg-brand-blue px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {testing ? "Probando…" : "Probar webhook ahora"}
              </button>
              {testResult && (
                <div
                  className={`mt-2 rounded-lg p-3 text-xs ${
                    testResult.ok
                      ? "bg-green-50 text-green-800"
                      : testResult.status === 422
                        ? "bg-amber-50 text-amber-900"
                        : "bg-red-50 text-red-800"
                  }`}
                >
                  <p className="font-semibold">
                    HTTP {testResult.status} — {testResult.message}
                  </p>
                  {testResult.response != null && (
                    <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap">
                      {JSON.stringify(testResult.response, null, 2)}
                    </pre>
                  )}
                </div>
              )}
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

            <div>
              <p className="text-xs text-brand-grey">Header CF V2 / prueba manual:</p>
              <code className="mt-1 block break-all rounded-lg bg-brand-off/60 p-2 text-xs">
                {headerExample}
              </code>
            </div>

            <ol className="list-decimal space-y-2 pl-4 text-xs text-brand-charcoal">
              <li>
                En ClickFunnels → Workspace Settings → Webhooks, crea el endpoint POST con la
                URL de arriba (<code>?org={info.organizationSlug}</code>).
              </li>
              <li>
                Copia el <strong>webhook secret</strong> que muestra CF al crear el endpoint.
              </li>
              <li>
                Guáralo aquí o en Vercel como{" "}
                <code>CLICKFUNNELS_WEBHOOK_SECRET</code> y redeploy.
              </li>
              <li>
                Eventos recomendados: <code>order.completed</code> o{" "}
                <code>one-time-order.completed</code>.
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
