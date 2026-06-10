import { API_BASE_URL } from "@/constants/config";
import { getAccessToken } from "./storage";
import type { WorkshopSlug } from "./workshops";

async function adminFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const text = await res.text();
  let data: T & { error?: string };
  try {
    data = JSON.parse(text) as T & { error?: string };
  } catch {
    throw new Error(
      text.startsWith("<")
        ? `Error del servidor (${res.status})`
        : text.slice(0, 160) || `HTTP ${res.status}`
    );
  }
  if (!res.ok) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return data;
}

export async function fetchSpaces(slug: WorkshopSlug) {
  const params = new URLSearchParams({ w: slug });
  return adminFetch<{ available: number; updatedAt: string | null }>(
    `/api/spaces?${params}`
  );
}

export async function updateSpaces(slug: WorkshopSlug, available: number) {
  return adminFetch<{ ok: boolean; available: number }>("/api/admin/spaces", {
    method: "POST",
    body: JSON.stringify({ workshop: slug, available }),
  });
}

export type AdminDateRow = {
  id: string;
  workshopSlug: string;
  workshopLabel: string;
  title: string;
  startsAt: string;
  venue: string | null;
  mapsUrl: string | null;
  capacity: number;
  soldCount: number;
  available: number;
  isActive: boolean;
  isSelling: boolean;
  checkedInCount: number;
};

export async function fetchAdminDates(slug: WorkshopSlug) {
  return adminFetch<{ dates: AdminDateRow[] }>(
    `/api/admin/dates?w=${encodeURIComponent(slug)}`
  );
}

export async function saveAdminDate(body: Record<string, unknown>) {
  return adminFetch<{ ok: boolean }>("/api/admin/dates", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteAdminDate(dateId: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/dates?id=${encodeURIComponent(dateId)}`,
    { method: "DELETE" }
  );
}

export type AdminRegistrationRow = {
  id: string;
  attendeeName: string | null;
  attendeeEmail: string;
  attendeePhone: string | null;
  source: string | null;
  workshop: string;
  eventDate: string;
  status: string;
  registeredAt: string;
  emailedAt: string | null;
  emailError: string | null;
  checkedIn: boolean;
  printStatus: string | null;
};

export async function fetchAdminRegistrations(slug: WorkshopSlug) {
  return adminFetch<{ registrations: AdminRegistrationRow[] }>(
    `/api/admin/registrations?w=${encodeURIComponent(slug)}`
  );
}

export async function createManualRegistration(body: {
  workshop: WorkshopSlug;
  email: string;
  name?: string;
  phone?: string;
  workshopDateId?: string;
  sendPassEmail?: boolean;
}) {
  return adminFetch<{ ok: boolean; registrationId: string; duplicate?: boolean }>(
    "/api/admin/registrations",
    { method: "POST", body: JSON.stringify(body) }
  );
}

export async function cancelRegistration(registrationId: string) {
  return adminFetch<{ ok: boolean }>("/api/admin/registrations", {
    method: "POST",
    body: JSON.stringify({ action: "cancel", registrationId }),
  });
}

export async function updateRegistration(
  registrationId: string,
  fields: { name?: string; phone?: string; email?: string }
) {
  return adminFetch<{ ok: boolean }>("/api/admin/registrations", {
    method: "POST",
    body: JSON.stringify({ action: "update", registrationId, ...fields }),
  });
}

export async function resendPassEmail(registrationId: string) {
  return adminFetch<{ ok: boolean }>("/api/admin/resend-email", {
    method: "POST",
    body: JSON.stringify({ registrationId }),
  });
}

export async function adminReprintLabel(registrationId: string) {
  return adminFetch<{ ok: boolean }>("/api/admin/print-jobs", {
    method: "POST",
    body: JSON.stringify({ registrationId }),
  });
}

export async function importCsv(
  slug: WorkshopSlug,
  csvText: string,
  sendPassEmail: boolean
) {
  return adminFetch<{
    ok: boolean;
    created: number;
    duplicates: number;
    failed: number;
  }>("/api/mobile/admin/import-csv", {
    method: "POST",
    body: JSON.stringify({
      workshop: slug,
      csv: csvText,
      sendPassEmail,
    }),
  });
}

export type LabelTemplate = {
  fontLarge: number;
  fontSmall: number;
  mediaSize: string;
  showEmail: boolean;
  showWorkshop: boolean;
};

export async function fetchLabelTemplate(slug: WorkshopSlug) {
  return adminFetch<{ template: LabelTemplate; hasCustomTemplate: boolean }>(
    `/api/admin/label-template?w=${encodeURIComponent(slug)}`
  );
}

export async function saveLabelTemplate(
  slug: WorkshopSlug,
  template: Partial<LabelTemplate>
) {
  return adminFetch<{ ok: boolean }>("/api/admin/label-template", {
    method: "POST",
    body: JSON.stringify({ workshop: slug, ...template }),
  });
}

export async function fetchWebhookInfo() {
  return adminFetch<{
    webhookUrl: string;
    secretConfigured: boolean;
    secretSource: "org" | "env" | null;
    organizationSlug: string;
  }>("/api/admin/webhook-info");
}

export async function testWebhook() {
  return adminFetch<{
    ok: boolean;
    status: number;
    message: string;
    response?: unknown;
  }>("/api/admin/webhook-info", { method: "POST" });
}

export type PendingPurchaseRow = {
  id: string;
  externalOrderId: string;
  email: string;
  name: string | null;
  phone: string | null;
  funnelLabel: string | null;
  createdAt: string;
};

export async function fetchPendingPurchases() {
  return adminFetch<{ pending: PendingPurchaseRow[]; count: number }>(
    "/api/admin/pending-purchases"
  );
}

export async function resolvePendingPurchase(
  webhookEventId: string,
  workshopSlug: WorkshopSlug
) {
  return adminFetch<{
    ok: boolean;
    duplicate?: boolean;
    registrationId?: string;
    passUrl?: string;
  }>("/api/admin/pending-purchases", {
    method: "POST",
    body: JSON.stringify({ webhookEventId, workshopSlug }),
  });
}

export type EmailTemplateAnchor = "event_start" | "checkin";

export type EmailTemplateRow = {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  delayHours: number;
  anchor: EmailTemplateAnchor;
  active: boolean;
};

export type EmailLogRow = {
  id: string;
  templateName: string;
  attendeeEmail: string;
  attendeeName: string | null;
  workshopLabel: string;
  sentAt: string;
  status: string;
  error: string | null;
};

export async function fetchEmailTemplates() {
  return adminFetch<{
    templates: EmailTemplateRow[];
    logs: EmailLogRow[];
  }>("/api/admin/email-templates");
}

export async function saveEmailTemplate(body: Record<string, unknown>) {
  return adminFetch<{ ok: boolean }>("/api/admin/email-templates", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function toggleEmailTemplate(id: string) {
  return adminFetch<{ ok: boolean }>("/api/admin/email-templates", {
    method: "POST",
    body: JSON.stringify({ id, action: "toggle" }),
  });
}

export async function deleteEmailTemplate(id: string) {
  return adminFetch<{ ok: boolean }>("/api/admin/email-templates", {
    method: "POST",
    body: JSON.stringify({ id, action: "delete" }),
  });
}

export type PrinterAgentRow = {
  id: string;
  name: string | null;
  lastSeenAt: string | null;
  createdAt: string;
};

export async function fetchPrinterAgents() {
  return adminFetch<{ agents: PrinterAgentRow[] }>("/api/admin/printer-pairing");
}

export async function createPrinterPairingCode() {
  return adminFetch<{
    ok: boolean;
    code: string;
    expiresAt: string;
    expiresInMinutes: number;
  }>("/api/admin/printer-pairing", {
    method: "POST",
    body: JSON.stringify({ action: "create" }),
  });
}

export async function revokePrinterAgent(agentId: string) {
  return adminFetch<{ ok: boolean }>("/api/admin/printer-pairing", {
    method: "POST",
    body: JSON.stringify({ action: "revoke", agentId }),
  });
}

export async function patchBranding(body: Record<string, string | null>) {
  return adminFetch<{ ok: boolean; organization: unknown }>(
    "/api/mobile/admin/branding",
    { method: "PATCH", body: JSON.stringify(body) }
  );
}
