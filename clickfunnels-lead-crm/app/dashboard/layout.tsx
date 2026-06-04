import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[250px_1fr]">
        <aside className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-2xl shadow-slate-200/80 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
            Lead CRM
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Dashboard
          </h2>
          <nav className="mt-8 space-y-2">
            <Link
              href="/dashboard"
              className="block rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Leads
            </Link>
          </nav>
          <div className="mt-8 rounded-3xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
              Usuario
            </p>
            <p className="mt-2 break-words text-sm font-medium text-slate-700">
              {user.email}
            </p>
          </div>
          <a
            href="/logout"
            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
          >
            Cerrar sesión
          </a>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
