import { LeadsDashboard } from "@/components/leads/LeadsDashboard";
import { normalizeLead } from "@/lib/leads";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <section className="rounded-[2rem] border border-red-100 bg-white p-6 shadow-xl shadow-slate-200/70">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
          Error de Supabase
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          No pudimos cargar los leads
        </h1>
        <p className="mt-3 text-sm text-slate-600">{error.message}</p>
      </section>
    );
  }

  const leads = (data ?? []).map((row) => normalizeLead(row));

  return <LeadsDashboard initialLeads={leads} />;
}
