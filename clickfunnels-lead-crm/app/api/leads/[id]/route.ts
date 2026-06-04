import { NextResponse } from "next/server";
import { cleanText, isLeadStatus, normalizeLead, type LeadStatus } from "@/lib/leads";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAuthenticatedUserResponse } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAuthenticatedUserResponse();
  if (response) {
    return response;
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
  const updates: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    status?: LeadStatus;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if ("name" in payload) {
    updates.name = cleanText(payload.name);
  }

  if ("email" in payload) {
    updates.email = cleanText(payload.email)?.toLowerCase() ?? null;
  }

  if ("phone" in payload) {
    updates.phone = cleanText(payload.phone);
  }

  if ("status" in payload) {
    if (!isLeadStatus(payload.status)) {
      return NextResponse.json({ error: "Invalid lead status" }, { status: 400 });
    }
    updates.status = payload.status;
  }

  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, lead: normalizeLead(data) });
}
