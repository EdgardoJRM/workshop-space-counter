type LaBovedaCheckinPayload = {
  registrationId: string;
  email: string;
  name: string;
  workshopSlug: string;
  checkedInAt: string;
};

export async function notifyLaBovedaCheckin(
  payload: LaBovedaCheckinPayload
): Promise<void> {
  const url = process.env.LA_BOVEDA_WEBHOOK_URL?.trim();
  const secret = process.env.LA_BOVEDA_WEBHOOK_SECRET?.trim();
  if (!url || !secret) return;

  const body = {
    id: `hp-checkin-${payload.registrationId}`,
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
    }
  } catch (err) {
    console.error("[la-boveda] webhook failed", err);
  }
}
