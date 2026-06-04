import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadDetail } from "@/components/leads/LeadDetail";
import { normalizeLead } from "@/lib/leads";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, getAuthenticatedUser()]);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("leads").select("*").eq("id", id).single();

  if (error || !data) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard"
        className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
      >
        Volver a leads
      </Link>
      <LeadDetail lead={normalizeLead(data)} userEmail={user?.email ?? "Usuario"} />
    </div>
  );
}
