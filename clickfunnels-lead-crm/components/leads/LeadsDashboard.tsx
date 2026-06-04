"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { LeadActions } from "@/components/leads/LeadActions";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { getLastNote, LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/leads";

type LeadsDashboardProps = {
  initialLeads: Lead[];
};

const ALL_STATUSES = "Todos";

export function LeadsDashboard({ initialLeads }: LeadsDashboardProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | typeof ALL_STATUSES>(
    ALL_STATUSES
  );
  const [isPending, startTransition] = useTransition();

  const filteredLeads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return leads
      .filter((lead) => {
        const haystack = [lead.name, lead.email, lead.phone]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
        const matchesStatus = statusFilter === ALL_STATUSES || lead.status === statusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [leads, query, statusFilter]);

  const counters = useMemo(() => {
    return LEAD_STATUSES.map((status) => ({
      status,
      count: leads.filter((lead) => lead.status === status).length,
    }));
  }, [leads]);

  function updateLeadStatus(id: string, status: LeadStatus) {
    const previous = leads;
    setLeads((current) =>
      current.map((lead) => (lead.id === id ? { ...lead, status } : lead))
    );

    startTransition(async () => {
      const response = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        setLeads(previous);
      }
    });
  }

  function exportCsv() {
    const headers = ["Nombre", "Email", "Teléfono", "Estado", "Fecha de entrada", "Última nota"];
    const rows = filteredLeads.map((lead) => [
      lead.name ?? "",
      lead.email ?? "",
      lead.phone ?? "",
      lead.status,
      formatDate(lead.created_at),
      getLastNote(lead),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {counters.map(({ status, count }) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className="rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/80"
          >
            <p className="text-3xl font-semibold text-slate-950">{count}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {status}
            </p>
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                Leads del funnel
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Ordenados por fecha más reciente. {filteredLeads.length} resultado(s).
              </p>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Exportar CSV
            </button>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px]">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, email o teléfono"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as LeadStatus | typeof ALL_STATUSES)
              }
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value={ALL_STATUSES}>Todos los estados</option>
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredLeads.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No hay leads con esos filtros todavía.
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <article
                key={lead.id}
                className="grid gap-4 p-5 transition hover:bg-slate-50 xl:grid-cols-[1.1fr_160px_1fr_260px]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-950">
                      {lead.name || "Lead sin nombre"}
                    </h2>
                    <LeadStatusBadge status={lead.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{lead.email || "Sin email"}</p>
                  <p className="text-sm text-slate-600">{lead.phone || "Sin teléfono"}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                    Entrada
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-600">
                    {formatDate(lead.created_at)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                    Última nota
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                    {getLastNote(lead)}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
                  <select
                    value={lead.status}
                    disabled={isPending}
                    onChange={(event) =>
                      updateLeadStatus(lead.id, event.target.value as LeadStatus)
                    }
                    className="rounded-2xl border border-slate-200 bg-white text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    {LEAD_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/leads/${lead.id}`}
                      className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-900"
                    >
                      Ver detalles
                    </Link>
                    <LeadActions
                      name={lead.name}
                      email={lead.email}
                      phone={lead.phone}
                      compact
                    />
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function escapeCsvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
