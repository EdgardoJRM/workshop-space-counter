import { NextResponse } from "next/server";
import { cleanText, normalizeLead } from "@/lib/leads";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAuthenticatedUserResponse } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireAuthenticatedUserResponse();
  if (response) {
    return response;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: (data ?? []).map((row) => normalizeLead(row)) });
}

export async function POST(request: Request) {
  const secret = process.env.CLICKFUNNELS_WEBHOOK_SECRET?.trim();

  if (!secret) {
    return NextResponse.json(
      { error: "CLICKFUNNELS_WEBHOOK_SECRET is not configured" },
      { status: 500 }
    );
  }

  if (!hasValidWebhookSecret(request, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Payload must be a JSON object" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const name = cleanText(payload.name);
  const email = cleanText(payload.email)?.toLowerCase() ?? null;
  const phone = cleanText(payload.phone);
  const formData =
    payload.form_data && typeof payload.form_data === "object" && !Array.isArray(payload.form_data)
      ? (payload.form_data as Record<string, unknown>)
      : collectAdditionalFields(payload);

  if (!name && !email && !phone) {
    return NextResponse.json(
      { error: "At least one of name, email or phone is required" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      name,
      email,
      phone,
      status: "Nuevo",
      form_data: formData,
      notes: [],
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, lead: normalizeLead(data) });
}

function hasValidWebhookSecret(request: Request, secret: string) {
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.toLowerCase().startsWith("bearer ")
    ? authorization.slice("bearer ".length)
    : null;

  return [
    request.headers.get("x-api-key"),
    request.headers.get("x-clickfunnels-webhook-secret"),
    request.headers.get("x-webhook-secret"),
    bearerToken,
  ].some((value) => value?.trim() === secret);
}

function collectAdditionalFields(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([key]) => !["name", "email", "phone", "form_data"].includes(key)
    )
  );
}
