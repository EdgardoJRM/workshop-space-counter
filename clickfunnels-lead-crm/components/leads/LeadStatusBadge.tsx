import { type LeadStatus } from "@/lib/leads";

const STATUS_STYLES: Record<LeadStatus, string> = {
  Nuevo: "bg-blue-50 text-blue-700 ring-blue-100",
  Contactado: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  "En Seguimiento": "bg-amber-50 text-amber-800 ring-amber-100",
  "Cita Agendada": "bg-emerald-50 text-emerald-700 ring-emerald-100",
  Cerrado: "bg-slate-900 text-white ring-slate-900",
  "No Interesado": "bg-zinc-100 text-zinc-600 ring-zinc-200",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}
