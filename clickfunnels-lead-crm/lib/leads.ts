export const LEAD_STATUSES = [
  "Nuevo",
  "Contactado",
  "En Seguimiento",
  "Cita Agendada",
  "Cerrado",
  "No Interesado",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type LeadNote = {
  note: string;
  created_at: string;
  created_by: string;
};

export type Lead = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  form_data: Record<string, unknown>;
  notes: LeadNote[];
  created_at: string;
  updated_at: string;
};

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && LEAD_STATUSES.includes(value as LeadStatus);
}

export function normalizeLead(row: Record<string, unknown>): Lead {
  return {
    id: String(row.id),
    name: typeof row.name === "string" ? row.name : null,
    email: typeof row.email === "string" ? row.email : null,
    phone: typeof row.phone === "string" ? row.phone : null,
    status: isLeadStatus(row.status) ? row.status : "Nuevo",
    form_data:
      row.form_data && typeof row.form_data === "object" && !Array.isArray(row.form_data)
        ? (row.form_data as Record<string, unknown>)
        : {},
    notes: Array.isArray(row.notes) ? (row.notes as LeadNote[]) : [],
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function cleanText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getLastNote(lead: Pick<Lead, "notes">): string {
  return lead.notes.at(-1)?.note?.trim() || "Sin notas";
}

export function buildWhatsAppUrl(phone: string | null, name?: string | null) {
  if (!phone) {
    return null;
  }

  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  const message = encodeURIComponent(
    `Hola${name ? ` ${name}` : ""}, te escribo para darle seguimiento a tu solicitud.`
  );

  return `https://wa.me/${digits}?text=${message}`;
}

export function buildEmailUrl(email: string | null, name?: string | null) {
  if (!email) {
    return null;
  }

  const subject = encodeURIComponent("Seguimiento a tu solicitud");
  const body = encodeURIComponent(
    `Hola${name ? ` ${name}` : ""},\n\nTe escribo para darle seguimiento a tu solicitud.`
  );

  return `mailto:${email}?subject=${subject}&body=${body}`;
}
