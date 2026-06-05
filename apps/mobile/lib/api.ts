import { API_BASE_URL } from "@/constants/config";
import { getAccessToken } from "./storage";
import type {
  BootstrapResponse,
  MobileEvent,
  OrganizationBranding,
  RegistrationRow,
} from "./types";

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ?? `HTTP ${res.status}`
    );
  }
  return data;
}

export async function fetchOrgBranding(
  slug: string
): Promise<OrganizationBranding> {
  const data = await apiFetch<{ organization: OrganizationBranding }>(
    `/api/mobile/org/${encodeURIComponent(slug)}`
  );
  return data.organization;
}

export async function requestMagicLink(
  email: string,
  orgSlug: string,
  intent: "staff" | "admin" = "staff"
): Promise<void> {
  await apiFetch("/api/mobile/auth/magic-link", {
    method: "POST",
    body: JSON.stringify({ email, orgSlug, intent }),
  });
}

export async function exchangeMagicToken(token: string): Promise<{
  accessToken: string;
  organization: OrganizationBranding;
}> {
  const res = await fetch(
    `${API_BASE_URL}/api/mobile/auth/exchange?format=json&token=${encodeURIComponent(token)}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Exchange failed");
  return {
    accessToken: data.accessToken,
    organization: data.organization,
  };
}

export async function bootstrap(): Promise<BootstrapResponse> {
  return apiFetch("/api/mobile/bootstrap");
}

export async function fetchEvents(): Promise<{
  todayKey: string;
  events: MobileEvent[];
}> {
  return apiFetch("/api/mobile/events");
}

export async function fetchRegistrations(
  workshopDateId: string,
  q?: string
): Promise<{ registrations: RegistrationRow[] }> {
  const params = new URLSearchParams({ workshopDateId });
  if (q) params.set("q", q);
  return apiFetch(`/api/mobile/registrations?${params}`);
}

export async function checkinScan(
  token: string,
  workshopDateId: string
): Promise<Record<string, unknown>> {
  return apiFetch("/api/mobile/checkins", {
    method: "POST",
    body: JSON.stringify({ token, workshopDateId }),
  });
}

export async function checkinById(
  registrationId: string,
  workshopDateId: string
): Promise<Record<string, unknown>> {
  return apiFetch("/api/mobile/checkins", {
    method: "POST",
    body: JSON.stringify({ registrationId, workshopDateId }),
  });
}

export async function reprintLabel(
  registrationId: string
): Promise<{ ok: boolean; jobId: string }> {
  return apiFetch("/api/mobile/reprint", {
    method: "POST",
    body: JSON.stringify({ registrationId }),
  });
}

export async function printerStatus(): Promise<{
  connected: boolean;
  pending: number;
  processing: number;
  printedLast24h: number;
  lastPollAt: string | null;
}> {
  return apiFetch("/api/mobile/printer-status");
}
