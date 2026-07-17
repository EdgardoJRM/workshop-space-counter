import type { PrintJobPayload } from "@/lib/print-jobs";

export const LOCAL_ROLLO_PRINT_URL = "http://127.0.0.1:3927";
export const LEGACY_IMPRESORA_AUTO_URL = "http://127.0.0.1:3000";

export type LocalPrintPath = "rollo-daemon" | "impresora-auto" | "chrome" | null;

export type LocalPrintProbe = {
  path: LocalPrintPath;
  printer: string | null;
};

const PROBE_CACHE_TTL_MS = 30_000;

let cachedProbe: LocalPrintProbe = { path: null, printer: null };
let cachedProbeAt = 0;

export function setCachedLocalPrintProbe(probe: LocalPrintProbe): void {
  cachedProbe = probe;
  cachedProbeAt = Date.now();
}

export function invalidateLocalPrintProbeCache(): void {
  cachedProbe = { path: null, printer: null };
  cachedProbeAt = 0;
}

function getCachedLocalPrintProbe(): LocalPrintProbe | null {
  if (Date.now() - cachedProbeAt > PROBE_CACHE_TTL_MS) return null;
  if (!cachedProbe.path) return null;
  return cachedProbe;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function probeLocalPrintPath(): Promise<LocalPrintProbe> {
  try {
    const res = await fetchWithTimeout(`${LOCAL_ROLLO_PRINT_URL}/health`, {}, 800);
    if (res.ok) {
      const data = (await res.json()) as { printer?: string | null };
      const probe: LocalPrintProbe = {
        path: "rollo-daemon",
        printer: data.printer ?? null,
      };
      setCachedLocalPrintProbe(probe);
      return probe;
    }
  } catch {
    // try legacy
  }

  try {
    const res = await fetchWithTimeout(`${LEGACY_IMPRESORA_AUTO_URL}/health`, {}, 800);
    if (res.ok) {
      const data = (await res.json()) as { printer?: string | null };
      const probe: LocalPrintProbe = {
        path: "impresora-auto",
        printer: data.printer ?? null,
      };
      setCachedLocalPrintProbe(probe);
      return probe;
    }
  } catch {
    // chrome fallback
  }

  const probe: LocalPrintProbe = { path: null, printer: null };
  setCachedLocalPrintProbe(probe);
  return probe;
}

export async function printPngViaLocalDaemon(
  pngDataUrl: string,
  mediaSize: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const pngBase64 = pngDataUrl.replace(/^data:image\/png;base64,/, "");
    const res = await fetchWithTimeout(
      `${LOCAL_ROLLO_PRINT_URL}/print`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pngBase64, mediaSize }),
      },
      8_000
    );
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Local print failed",
    };
  }
}

export async function printPayloadViaImpresoraAuto(
  payload: PrintJobPayload
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetchWithTimeout(
      `${LEGACY_IMPRESORA_AUTO_URL}/imprimir`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          fontLarge: payload.fontLarge,
          fontSmall: payload.fontSmall,
          mediaSize: payload.mediaSize,
          showEmail: payload.showEmail,
          showWorkshop: payload.showWorkshop,
          workshopLabel: payload.workshopLabel,
        }),
      },
      8_000
    );
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Impresora Auto failed",
    };
  }
}

async function printWithProbe(
  probe: LocalPrintProbe,
  pngDataUrl: string,
  payload: PrintJobPayload,
  printViaChrome: () => Promise<void>
): Promise<{ path: LocalPrintPath }> {
  if (probe.path === "rollo-daemon") {
    const result = await printPngViaLocalDaemon(pngDataUrl, payload.mediaSize);
    if (result.ok) return { path: "rollo-daemon" };
    throw new Error(result.error ?? "Rollo daemon print failed");
  }

  if (probe.path === "impresora-auto") {
    const result = await printPayloadViaImpresoraAuto(payload);
    if (result.ok) return { path: "impresora-auto" };
    throw new Error(result.error ?? "Impresora Auto print failed");
  }

  await printViaChrome();
  return { path: "chrome" };
}

export async function printLabelWithBestPath(
  pngDataUrl: string,
  payload: PrintJobPayload,
  printViaChrome: () => Promise<void>
): Promise<{ path: LocalPrintPath }> {
  const cached = getCachedLocalPrintProbe();
  const probe = cached ?? (await probeLocalPrintPath());

  try {
    return await printWithProbe(probe, pngDataUrl, payload, printViaChrome);
  } catch (firstError) {
    if (cached) {
      invalidateLocalPrintProbeCache();
      const freshProbe = await probeLocalPrintPath();
      try {
        return await printWithProbe(freshProbe, pngDataUrl, payload, printViaChrome);
      } catch {
        throw firstError;
      }
    }
    throw firstError;
  }
}
