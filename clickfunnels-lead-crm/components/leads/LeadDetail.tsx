"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LeadActions } from "@/components/leads/LeadActions";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/leads";

type LeadDetailProps = {
  lead: Lead;
  userEmail: string;
};

export function LeadDetail({ lead: initialLead, userEmail }: LeadDetailProps) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [name, setName] = useState(initialLead.name ?? "");
  const [email, setEmail] = useState(initialLead.email ?? "");
  const [phone, setPhone] = useState(initialLead.phone ?? "");
  const [status, setStatus] = useState<LeadStatus>(initialLead.status);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, status }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo guardar el lead.");
        return;
      }

      setLead(data.lead);
      setMessage("Lead actualizado.");
      router.refresh();
    });
  }

  function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const response = await fetch(`/api/leads/${lead.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "No se pudo añadir la nota.");
        return;
      }

      setLead(data.lead);
      setNote("");
      setMessage("Nota añadida.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Detalle del lead
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {lead.name || "Lead sin nombre"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Entró el {formatDate(lead.created_at)}
            </p>
          </div>
          <div className="space-y-3">
            <LeadStatusBadge status={status} />
            <LeadActions name={name} email={email} phone={phone} />
          </div>
        </div>

        {message && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {message}
          </div>
        )}

        <form onSubmit={saveLead} className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Nombre</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Estado</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as LeadStatus)}
              className="mt-2 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              {LEAD_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Teléfono</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-2 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Guardar cambios
            </button>
          </div>
        </form>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-950">
            Respuestas del formulario
          </h2>
          <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200">
            {Object.entries(lead.form_data).length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Sin respuestas adicionales.</p>
            ) : (
              Object.entries(lead.form_data).map(([key, value]) => (
                <div
                  key={key}
                  className="grid gap-2 border-b border-slate-100 p-4 last:border-b-0 md:grid-cols-[220px_1fr]"
                >
                  <p className="text-sm font-semibold text-slate-900">{key}</p>
                  <p className="whitespace-pre-wrap text-sm text-slate-600">
                    {formatFormValue(value)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70">
          <h2 className="text-lg font-semibold text-slate-950">Añadir nota</h2>
          <form onSubmit={addNote} className="mt-4 space-y-4">
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              required
              rows={5}
              className="block w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="Escribe el seguimiento realizado..."
            />
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Guardar nota
            </button>
          </form>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70">
          <h2 className="text-lg font-semibold text-slate-950">Historial</h2>
          <div className="mt-5 space-y-4">
            {lead.notes.length === 0 ? (
              <p className="text-sm text-slate-500">Aún no hay notas internas.</p>
            ) : (
              [...lead.notes].reverse().map((item, index) => (
                <div key={`${item.created_at}-${index}`} className="rounded-3xl bg-slate-50 p-4">
                  <p className="whitespace-pre-wrap text-sm text-slate-900">{item.note}</p>
                  <p className="mt-3 text-xs text-slate-400">
                    {formatDate(item.created_at)} · {item.created_by || userEmail}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatFormValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Sin respuesta";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}
