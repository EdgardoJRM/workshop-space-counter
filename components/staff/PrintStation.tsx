"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PrintJobPayload } from "@/lib/print-jobs";
import {
  ROLLO_PRINT_RELAY_ZIP_NAME,
  ROLLO_PRINT_RELAY_ZIP_PATH,
} from "@/lib/rollo-print-download";
import { isChromiumBrowser, printLabelPayload } from "@/lib/label-print-html";
import { probeLocalPrintPath, type LocalPrintProbe } from "@/lib/local-rollo-print";
import { CHROME_KIOSK_OPEN_COMMAND } from "@/lib/print-station-url";

type PrintJobResponse = {
  id: string;
  registrationId: string;
  trigger: string;
  payload: PrintJobPayload;
  attempts: number;
};

type StationStatus = "idle" | "printing" | "error";

const POLL_MS = 150;

function isTransientFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("load failed")
  );
}

function relayLabel(probe: LocalPrintProbe): string | null {
  if (probe.path === "rollo-daemon") {
    return probe.printer ? `Relay activo · ${probe.printer}` : "Relay activo";
  }
  if (probe.path === "impresora-auto") {
    return probe.printer ? `Impresora Auto · ${probe.printer}` : "Impresora Auto";
  }
  return null;
}

export function PrintStation() {
  const [armed, setArmed] = useState(true);
  const [status, setStatus] = useState<StationStatus>("idle");
  const [lastName, setLastName] = useState<string | null>(null);
  const [lastPrintedAt, setLastPrintedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [printedCount, setPrintedCount] = useState(0);
  const [macAgentActive, setMacAgentActive] = useState(false);
  const [localPrint, setLocalPrint] = useState<LocalPrintProbe>({
    path: null,
    printer: null,
  });

  const armedRef = useRef(armed);
  const busyRef = useRef(false);
  const printedJobIdsRef = useRef(new Set<string>());
  const pollQueueRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    armedRef.current = armed;
  }, [armed]);

  useEffect(() => {
    let cancelled = false;
    const pollAgent = async () => {
      try {
        const res = await fetch("/api/staff/printer-status");
        if (!res.ok) return;
        const data = (await res.json()) as { connected?: boolean };
        if (!cancelled) setMacAgentActive(Boolean(data.connected));
      } catch {
        if (!cancelled) setMacAgentActive(false);
      }
    };
    void pollAgent();
    const id = window.setInterval(() => void pollAgent(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const pollLocal = async () => {
      const probe = await probeLocalPrintPath();
      if (!cancelled) setLocalPrint(probe);
    };
    void pollLocal();
    const id = window.setInterval(() => void pollLocal(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const completeJob = useCallback(
    async (jobId: string, success: boolean, message?: string) => {
      const res = await fetch(`/api/staff/print-jobs/${jobId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success, error: message }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Error ${res.status}`);
      }
    },
    []
  );

  const completeJobAsync = useCallback(
    (jobId: string, success: boolean, message?: string) => {
      void completeJob(jobId, success, message).catch((e) => {
        const detail = e instanceof Error ? e.message : "Error al confirmar";
        setError(
          success
            ? `Label impreso pero no se confirmó en el servidor (${detail}).`
            : detail
        );
        if (!success) setStatus("error");
      });
    },
    [completeJob]
  );

  const processJob = useCallback(
    async (job: PrintJobResponse) => {
      if (printedJobIdsRef.current.has(job.id)) return;
      printedJobIdsRef.current.add(job.id);

      setStatus("printing");
      setError(null);
      setReconnecting(false);
      setLastName(job.payload.name);

      try {
        await printLabelPayload(job.payload);
        setPrintedCount((n) => n + 1);
        setLastPrintedAt(new Date().toLocaleTimeString("es-PR"));
        setStatus("idle");
        busyRef.current = false;
        completeJobAsync(job.id, true);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Error de impresión";
        completeJobAsync(job.id, false, message);
        setError(message);
        setStatus("error");
        busyRef.current = false;
      } finally {
        if (armedRef.current) {
          void pollQueueRef.current?.();
        }
      }
    },
    [completeJobAsync]
  );

  const pollQueue = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      const res = await fetch("/api/staff/print-jobs/next");
      if (res.status === 401) {
        busyRef.current = false;
        setError("Sesión expirada. Recarga la página o vuelve a iniciar sesión.");
        setStatus("error");
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      const data = (await res.json()) as { job: PrintJobResponse | null };
      setReconnecting(false);
      if (data.job) {
        await processJob(data.job);
      } else {
        busyRef.current = false;
        setStatus((s) => (s === "printing" ? s : "idle"));
      }
    } catch (e) {
      busyRef.current = false;
      if (isTransientFetchError(e)) {
        setReconnecting(true);
        return;
      }
      setError(e instanceof Error ? e.message : "Error de cola");
      setStatus("error");
    }
  }, [processJob]);

  pollQueueRef.current = pollQueue;

  useEffect(() => {
    if (!isChromiumBrowser()) return;

    const tick = () => {
      if (!armedRef.current) return;
      void pollQueue();
    };

    const id = window.setInterval(tick, POLL_MS);
    void tick();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void pollQueue();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pollQueue]);

  async function handleTestPrint() {
    if (!isChromiumBrowser()) {
      setError("La impresión de prueba requiere Google Chrome en la Mac del evento.");
      return;
    }
    if (testBusy || busyRef.current) return;

    setTestBusy(true);
    setError(null);
    busyRef.current = true;

    try {
      const res = await fetch("/api/staff/print-jobs/test", { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        jobId?: string;
        registrationId?: string;
        payload?: PrintJobPayload;
      };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      if (!data.jobId || !data.payload) {
        throw new Error("Respuesta de prueba incompleta");
      }

      await processJob({
        id: data.jobId,
        registrationId: data.registrationId ?? "",
        trigger: "test_station",
        payload: data.payload,
        attempts: 1,
      });
    } catch (e) {
      busyRef.current = false;
      if (isTransientFetchError(e)) {
        setReconnecting(true);
      } else {
        setError(e instanceof Error ? e.message : "No se pudo imprimir la prueba");
        setStatus("error");
      }
    } finally {
      setTestBusy(false);
    }
  }

  async function copyKioskCommand() {
    try {
      await navigator.clipboard.writeText(CHROME_KIOSK_OPEN_COMMAND);
    } catch {
      // ignore
    }
  }

  const chromium = isChromiumBrowser();
  const relayReady = localPrint.path === "rollo-daemon" || localPrint.path === "impresora-auto";
  const relayText = relayLabel(localPrint);
  const showSetup = !relayReady || !chromium;

  return (
    <div className="min-h-screen bg-brand-off text-brand-ink">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-grey">
            Hernandez Pass
          </p>
          <h1 className="mt-1 text-2xl font-bold">Estación de impresión</h1>
          <p className="mt-1 text-sm text-brand-grey">
            Deja Chrome abierto con la estación armada.
          </p>
        </header>

        <section className="rounded-2xl border border-brand-grey/20 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-brand-grey">Estado</p>
              <p className="mt-1 text-lg font-semibold">
                {!armed
                  ? "Pausada"
                  : status === "printing"
                    ? "Imprimiendo…"
                    : reconnecting
                      ? "Reconectando…"
                      : status === "error"
                        ? "Error"
                        : "Esperando labels"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setArmed((v) => !v)}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                armed ? "bg-brand-slate" : "bg-brand-grey"
              }`}
            >
              {armed ? "Armada" : "Pausada"}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                relayReady
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  relayReady ? "bg-emerald-500" : "bg-red-500"
                }`}
                aria-hidden
              />
              {relayText ?? "Relay no detectado"}
            </span>
            {!chromium && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-900">
                Usa Chrome, no Safari
              </span>
            )}
            {armed && macAgentActive && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-900">
                Agente Mac antiguo activo
              </span>
            )}
          </div>

          {!relayReady && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href={ROLLO_PRINT_RELAY_ZIP_PATH}
                download={ROLLO_PRINT_RELAY_ZIP_NAME}
                className="rounded-lg bg-brand-slate px-3 py-1.5 text-xs font-medium text-white"
              >
                Descargar relay
              </a>
              <span className="text-xs text-brand-grey">
                Abre <code className="text-[10px]">Iniciar-Rollo.command</code> y recarga.
              </span>
            </div>
          )}

          {reconnecting && !error && (
            <p className="mt-4 text-sm text-brand-grey">
              Reconectando… la estación sigue armada.
            </p>
          )}

          {lastName && (
            <p className="mt-4 text-sm text-brand-grey">
              Último: <span className="font-medium text-brand-ink">{lastName}</span>
              {lastPrintedAt ? ` · ${lastPrintedAt}` : null}
            </p>
          )}

          <p className="mt-2 text-xs text-brand-grey">
            Impresos en esta sesión: {printedCount}
          </p>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={testBusy}
            onClick={() => void handleTestPrint()}
            className="mt-5 w-full rounded-lg border border-brand-grey/30 px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {testBusy ? "Imprimiendo…" : "Probar label"}
          </button>
        </section>

        <details
          className="mt-4 rounded-2xl border border-brand-grey/15 bg-white/60 px-4 py-3 text-sm"
          open={showSetup}
        >
          <summary className="cursor-pointer font-medium text-brand-ink">
            Configuración
          </summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs text-brand-grey">
            <li>
              Descarga el relay, descomprime y abre{" "}
              <code className="text-[10px]">Iniciar-Rollo.command</code> (Terminal abierta).
            </li>
            <li>Rollo = impresora predeterminada (3×2″).</li>
            <li>Cierra Chrome (Cmd+Q) y ábrelo con kiosk:</li>
          </ol>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-brand-off p-3 text-[10px] text-brand-ink">
            {CHROME_KIOSK_OPEN_COMMAND}
          </pre>
          <button
            type="button"
            onClick={() => void copyKioskCommand()}
            className="mt-2 rounded border border-brand-grey/30 px-2 py-1 text-[11px] font-medium"
          >
            Copiar comando
          </button>
        </details>
      </div>
    </div>
  );
}
