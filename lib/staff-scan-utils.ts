export function extractTokenFromPayload(raw: string): string {
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

export type ScanResult = {
  status: "checked_in" | "already_checked_in";
  attendeeName: string;
  workshopLabel: string;
  checkedInAt: string;
  printJobQueued?: boolean;
  printError?: string;
};

export async function postCheckin(body: {
  token?: string;
  registrationId?: string;
  workshopDateId?: string;
}): Promise<
  | { ok: true; result: ScanResult }
  | { ok: false; error: string; status: number }
> {
  try {
    const res = await fetch("/api/checkins/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    let data: {
      ok?: boolean;
      error?: string;
      status?: ScanResult["status"];
      attendeeName?: string;
      workshopLabel?: string;
      checkedInAt?: string;
      printJobQueued?: boolean;
      printError?: string;
    };

    try {
      data = (await res.json()) as typeof data;
    } catch {
      return {
        ok: false,
        error: `Respuesta inválida del servidor (${res.status})`,
        status: res.status,
      };
    }

    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.error ?? `Error ${res.status}`,
        status: res.status,
      };
    }

    if (!data.status || !data.attendeeName || !data.checkedInAt) {
      return {
        ok: false,
        error: "Respuesta incompleta del servidor",
        status: res.status,
      };
    }

    return {
      ok: true,
      result: {
        status: data.status,
        attendeeName: data.attendeeName,
        workshopLabel: data.workshopLabel ?? "",
        checkedInAt: data.checkedInAt,
        printJobQueued: data.printJobQueued,
        printError: data.printError,
      },
    };
  } catch {
    return {
      ok: false,
      error: "Error de red. Comprueba la conexión.",
      status: 0,
    };
  }
}
