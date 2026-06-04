import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/dashboard");
    }
  } catch {
    // The form remains visible if env vars are not configured yet.
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white p-8 shadow-2xl shadow-slate-200/80">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
          ClickFunnels Lead CRM
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Acceso privado
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Entra con tu usuario autorizado de Supabase para revisar, organizar y
          dar seguimiento a los leads del funnel.
        </p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
