"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PrintJobPayload } from "@/lib/print-jobs";
import { ChromePrintNote } from "@/components/admin/ChromePrintNote";
import { isChromiumBrowser, printLabelPayload } from "@/lib/label-print-html";

type PrintJobResponse = {
  id: string;
  registrationId: string;
  trigger: string;
  payload: PrintJobPayload;
  attempts: number;
};

type StationStatus = "idle" | "printing" | "error";

const POLL_MS = 900;

function isTransientFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("load failed")
  );
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

  const armedRef = useRef(armed);
  const busyRef = useRef(false);
  const printedJobIdsRef = useRef(new Set<string>());

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
        await completeJob(job.id, true);
        setPrintedCount((n) => n + 1);
        setLastPrintedAt(new Date().toLocaleTimeString("es-PR"));
        setStatus("idle");
      } catch (e) {
        const message = e instanceof Error ? e.message : "Error de impresión";
        try {
          await completeJob(job.id, false, message);
        } catch {
          // keep local error visible
        }
        setError(message);
        setStatus("error");
      } finally {
        busyRef.current = false;
      }
    },
    [completeJob]
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

    setTestBusy(true);
    setError(null);
    busyRef.current = true;
    try {
      const res = await fetch("/api/staff/print-jobs/test", { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        jobId?: string;
        payload?: PrintJobPayload;
      };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      if (!data.jobId || !data.payload) {
        throw new Error("Respuesta de prueba incompleta");
      }

      setLastName(data.payload.name);
      setStatus("printing");
      try {
        await printLabelPayload(data.payload);
        await completeJob(data.jobId, true);
        setPrintedCount((n) => n + 1);
        setLastPrintedAt(new Date().toLocaleTimeString("es-PR"));
        setStatus("idle");
        setReconnecting(false);
      } catch (printErr) {
        const message =
          printErr instanceof Error ? printErr.message : "Error de impresión";
        try {
          await completeJob(data.jobId, false, message);
        } catch {
          // keep local error visible
        }
        throw printErr;
      }
    } catch (e) {
      if (isTransientFetchError(e)) {
        setReconnecting(true);
      } else {
        setError(e instanceof Error ? e.message : "No se pudo imprimir la prueba");
        setStatus("error");
      }
    } finally {
      busyRef.current = false;
      setTestBusy(false);
    }
  }

  const chromium = isChromiumBrowser();

  return (
    <div className="min-h-screen bg-brand-off text-brand-ink">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-grey">
            Hernandez Pass
          </p>
          <h1 className="mt-1 text-2xl font-bold">Estación de impresión</h1>
          <p className="mt-2 text-sm text-brand-grey">
            Deja esta pestaña abierta en Chrome. Los check-ins imprimen solos.
          </p>
          <ChromePrintNote className="mt-4" />
        </header>

        {!chromium && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Usa <strong>Google Chrome</strong> (no Safari). Abre con{" "}
            <code className="text-xs">--kiosk-printing</code> para imprimir sin
            diálogo.
          </div>
        )}

        {armed && macAgentActive && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Hay un <strong>agente Mac antiguo</strong> conectado a la cola. Si ya
            no lo usas, revócalo en Admin → Impresora. Solo debe consumir la cola
            esta pestaña de Chrome.
          </div>
        )}

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

          {reconnecting && !error && (
            <p className="mt-4 rounded-lg bg-brand-off px-3 py-2 text-sm text-brand-grey">
              Sin conexión momentánea (Mac en reposo o red lenta). Sigue armada — se
              reconecta sola.
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

        <section className="mt-6 rounded-2xl border border-brand-grey/20 bg-white/80 p-5 text-sm text-brand-grey">
          <h2 className="font-semibold text-brand-ink">Setup (una vez)</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Rollo = impresora predeterminada en macOS (3×2″).</li>
            <li>
              Abre Chrome con impresión silenciosa:
              <pre className="mt-2 overflow-x-auto rounded-lg bg-brand-off p-3 text-[11px] text-brand-ink">
                {`open -a "Google Chrome" --args --kiosk-printing https://pass.edgardohernandez.com/staff/print-station`}
              </pre>
            </li>
            <li>Personaliza el label en Admin web → Labels (aplica al siguiente job).</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
