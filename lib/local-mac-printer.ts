export type LocalMacPrinterInfo = {
  name: string;
  offline: boolean;
  configured: boolean;
};

const LOCAL_PRINTER_URL = "http://127.0.0.1:3000/printer";

/** Lee la impresora predeterminada de macOS vía Impresora Auto local (lpstat). */
export async function fetchLocalMacPrinter(): Promise<LocalMacPrinterInfo | null> {
  try {
    const res = await fetch(LOCAL_PRINTER_URL, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      name?: string;
      offline?: boolean;
      configured?: boolean;
    };
    const name = (data.name ?? "").trim();
    return {
      name,
      offline: Boolean(data.offline),
      configured: Boolean(data.configured ?? name),
    };
  } catch {
    return null;
  }
}
