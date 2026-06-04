import { NextResponse } from "next/server";
import { cleanText, normalizeLead, type LeadNote } from "@/lib/leads";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAuthenticatedUserResponse } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuthenticatedUserResponse();
  if (response || !user) {
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

  const note = cleanText((body as Record<string, unknown>).note);
  if (!note) {
    return NextResponse.json({ error: "Note is required" }, { status: 400 });
  }

  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: fetchError?.message || "Lead not found" },
      { status: fetchError?.code === "PGRST116" ? 404 : 500 }
    );
  }

  const currentNotes = Array.isArray(existing.notes) ? (existing.notes as LeadNote[]) : [];
  const nextNotes: LeadNote[] = [
    ...currentNotes,
    {
      note,
      created_at: new Date().toISOString(),
      created_by: user.email ?? user.id,
    },
  ];

  const { data, error } = await supabase
    .from("leads")
    .update({
      notes: nextNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, lead: normalizeLead(data) });
}
