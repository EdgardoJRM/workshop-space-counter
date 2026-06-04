export type AdminView =
  | "home"
  | "spaces"
  | "registrations"
  | "dates"
  | "labels"
  | "webhook"
  | "emails";

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
    description: "Crear, editar y activar fecha del taller",
    group: "workshop",
  },
  {
    id: "registrations",
    label: "Registros",
    description: "Lista, registro manual, CSV y reenvío de pase",
    group: "workshop",
  },
  {
    id: "labels",
    label: "Labels",
    description: "Plantilla Rollo e impresión en check-in",
    group: "workshop",
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
