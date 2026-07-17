export type AdminView =
  | "home"
  | "spaces"
  | "registrations"
  | "dates"
  | "labels"
  | "printer"
  | "webhook"
  | "emails"
  | "pending-purchases"
  | "guest-info";

export type NavItem = {
  id: AdminView;
  label: string;
  description: string;
  group: "workshop" | "system";
};

export const ADMIN_NAV: NavItem[] = [
  {
    id: "home",
    label: "Inicio",
    description: "Resumen y accesos rápidos",
    group: "workshop",
  },
  {
    id: "spaces",
    label: "Cupos",
    description: "Contador en ClickFunnels",
    group: "workshop",
  },
  {
    id: "dates",
    label: "Fechas",
    description: "En venta (webhook) y evento de hoy (check-in)",
    group: "workshop",
  },
  {
    id: "registrations",
    label: "Personas",
    description: "Lista por fecha, registro manual, CSV y reenvío",
    group: "workshop",
  },
  {
    id: "labels",
    label: "Labels",
    description: "Plantilla Rollo e impresión en check-in",
    group: "workshop",
  },
  {
    id: "printer",
    label: "Impresora",
    description: "Emparejar Mac con la Rollo (código SaaS)",
    group: "system",
  },
  {
    id: "pending-purchases",
    label: "Compras sin asignar",
    description: "ClickFunnels sin taller detectado",
    group: "system",
  },
  {
    id: "guest-info",
    label: "Invitados pendientes",
    description: "Boletos extra sin datos del invitado",
    group: "system",
  },
  {
    id: "webhook",
    label: "Webhook",
    description: "URL y secreto para ClickFunnels",
    group: "system",
  },
  {
    id: "emails",
    label: "Emails",
    description: "Secuencia post-evento",
    group: "system",
  },
];

export function viewNeedsWorkshop(view: AdminView): boolean {
  return (
    view === "spaces" ||
    view === "registrations" ||
    view === "dates" ||
    view === "labels"
  );
}

export function getViewMeta(view: AdminView): { title: string; description: string } {
  const item = ADMIN_NAV.find((n) => n.id === view);
  return {
    title: item?.label ?? "Admin",
    description: item?.description ?? "",
  };
}
