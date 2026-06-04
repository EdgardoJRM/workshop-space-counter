"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ScanResult = {
  status: "checked_in" | "already_checked_in";
  attendeeName: string;
  workshopLabel: string;
  checkedInAt: string;
  printJobQueued?: boolean;
};

function extractTokenFromPayload(raw: string): string {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    const passIdx = parts.indexOf("pass");
    if (passIdx >= 0 && parts[passIdx + 1]) {
      return parts[passIdx + 1];
    }
  } catch {
    /* not a URL */
  }
  if (trimmed.startsWith("hp:")) return trimmed;
  return trimmed;
}

export function StaffScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  const [manualToken, setManualToken] = useState("");
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const submitScan = useCallback(async (raw: string) => {
    const token = extractTokenFromPayload(raw);
    if (!token || busy) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkins/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        status?: ScanResult["status"];
        attendeeName?: string;
        workshopLabel?: string;
        checkedInAt?: string;
        printJobQueued?: boolean;
      };

      if (!res.ok || !data.ok) {
        setError(data.error ?? `Error ${res.status}`);
        return;
      }

      setLastResult({
        status: data.status!,
        attendeeName: data.attendeeName!,
        workshopLabel: data.workshopLabel!,
        checkedInAt: data.checkedInAt!,
        printJobQueued: data.printJobQueued,
      });
    } catch {
      setError("Error de red");
    } finally {
      setBusy(false);
    }
  }, [busy]);

  useEffect(() => {
    if (!cameraOn) return;

    let cancelled = false;
    const detectorSupported =
      typeof window !== "undefined" && "BarcodeDetector" in window;

    async function startCamera() {
      setCameraError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if (!detectorSupported) {
          setCameraError(
            "Tu navegador no soporta escaneo automático. Usa el campo manual."
          );
          return;
        }

        // @ts-expect-error BarcodeDetector is not in TS lib yet
        const detector = new BarcodeDetector({ formats: ["qr_code"] });

        scanningRef.current = true;
        const tick = async () => {
          if (!scanningRef.current || cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && !busy) {
              await submitScan(codes[0].rawValue);
              await new Promise((r) => setTimeout(r, 2000));
            }
          } catch {
            /* frame skip */
          }
          if (scanningRef.current && !cancelled) {
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      } catch (e) {
        setCameraError(
          e instanceof Error ? e.message : "No se pudo acceder a la cámara"
        );
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      scanningRef.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [cameraOn, busy, submitScan]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login?intent=staff";
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
            Staff Scanner
          </p>
          <h1 className="text-xl font-semibold text-brand-slate">Check-in</h1>
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="text-sm text-brand-charcoal underline"
        >
          Salir
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-brand-grey/25 bg-black">
        <video
          ref={videoRef}
          className="aspect-[4/3] w-full object-cover"
          playsInline
          muted
        />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setCameraOn((v) => !v)}
          className="flex-1 rounded-lg bg-brand-slate py-2.5 text-sm font-semibold text-white"
        >
          {cameraOn ? "Detener cámara" : "Activar cámara"}
        </button>
      </div>

      {cameraError && (
        <p className="mt-2 text-sm text-amber-700" role="status">
          {cameraError}
        </p>
      )}

      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submitScan(manualToken);
        }}
      >
        <label className="block text-sm font-medium text-brand-charcoal">
          Token manual (URL o código)
        </label>
        <input
          value={manualToken}
          onChange={(e) => setManualToken(e.target.value)}
          className="block w-full rounded-lg border-brand-grey/35"
          placeholder="https://…/pass/…"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !manualToken.trim()}
          className="w-full rounded-xl bg-brand-gold py-3 text-sm font-semibold text-brand-ink disabled:opacity-60"
        >
          {busy ? "Validando…" : "Validar check-in"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {lastResult && (
        <div
          className={`mt-4 rounded-xl border p-4 ${
            lastResult.status === "checked_in"
              ? "border-brand-blue/30 bg-brand-blue/5"
              : "border-brand-gold/40 bg-brand-gold/10"
          }`}
        >
          <p className="font-semibold text-brand-ink">
            {lastResult.status === "checked_in"
              ? "Check-in exitoso"
              : "Ya registrado"}
          </p>
          <p className="mt-1 text-sm text-brand-charcoal">
            {lastResult.attendeeName} — {lastResult.workshopLabel}
          </p>
          <p className="mt-1 text-xs text-brand-grey">
            {new Date(lastResult.checkedInAt).toLocaleString("es")}
          </p>
          {lastResult.status === "checked_in" && lastResult.printJobQueued && (
            <p className="mt-2 text-xs font-medium text-brand-blue">
              Label en cola — la impresora lo tomará en segundos.
            </p>
          )}
          {lastResult.status === "already_checked_in" && (
            <p className="mt-2 text-xs text-brand-grey">
              No se imprime de nuevo automáticamente. Usa reimprimir en admin si
              hace falta.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
