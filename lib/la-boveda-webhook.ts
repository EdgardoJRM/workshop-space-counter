type LaBovedaCheckinPayload = {
  registrationId: string;
  email: string;
  name: string;
  workshopSlug: string;
  checkedInAt: string;
  externalEventId?: string;
};

export type LaBovedaWebhookResult =
  | { ok: true; status: number }
  | { ok: false; code: "NOT_CONFIGURED" | "REJECTED" | "FAILED"; error: string; status?: number };

export async function notifyLaBovedaCheckin(
  payload: LaBovedaCheckinPayload
): Promise<LaBovedaWebhookResult> {
  const url = process.env.LA_BOVEDA_WEBHOOK_URL?.trim();
  const secret = process.env.LA_BOVEDA_WEBHOOK_SECRET?.trim();
  if (!url || !secret) {
    return { ok: false, code: "NOT_CONFIGURED", error: "LA_BOVEDA_WEBHOOK_URL/SECRET not set" };
  }

  const body = {
    id: payload.externalEventId ?? `hp-checkin-${payload.registrationId}`,
    email: payload.email.trim().toLowerCase(),
    name: payload.name,
    product_id: payload.workshopSlug,
    workshop: payload.workshopSlug,
    registrationId: payload.registrationId,
    checkedInAt: payload.checkedInAt,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": secret,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[la-boveda] webhook rejected", res.status, text);
      return {
        ok: false,
        code: "REJECTED",
        status: res.status,
        error: text.slice(0, 200) || `HTTP ${res.status}`,
      };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    console.error("[la-boveda] webhook failed", err);
    return {
      ok: false,
      code: "FAILED",
      error: err instanceof Error ? err.message : "Webhook request failed",
    };
  }
}
