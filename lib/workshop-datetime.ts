/** Talleres en Puerto Rico — hora de pared consistente en admin, pase y emails. */
export const WORKSHOP_TIMEZONE = "America/Puerto_Rico";

export function formatWorkshopDateTime(d: Date): string {
  return new Intl.DateTimeFormat("es-PR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: WORKSHOP_TIMEZONE,
  }).format(d);
}

/** Interpreta `datetime-local` (sin zona) como hora en Puerto Rico. */
export function parseWorkshopDatetimeLocal(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  return new Date(`${normalized}-04:00`);
}

/** Valor enviado desde admin: ISO o `datetime-local`. */
export function parseStartsAtInput(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/[zZ]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return parseWorkshopDatetimeLocal(trimmed);
}

/** Separa `YYYY-MM-DDTHH:mm` en fecha y hora para pickers nativos. */
export function splitWorkshopDatetimeLocal(value: string): {
  date: string;
  time: string;
} {
  const trimmed = value.trim();
  if (!trimmed) return { date: "", time: "10:00" };
  const [date, timePart] = trimmed.split("T");
  const time = (timePart ?? "10:00").slice(0, 5);
  return { date: date ?? "", time: time || "10:00" };
}

/** Une fecha y hora en formato `datetime-local` (hora Puerto Rico). */
export function joinWorkshopDatetimeLocal(date: string, time: string): string {
  const d = date.trim();
  if (!d) return "";
  const t = (time.trim() || "10:00").slice(0, 5);
  return `${d}T${t}`;
}

/** Valor para `<input type="datetime-local">` en hora Puerto Rico. */
export function toWorkshopDatetimeLocalInput(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: WORKSHOP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
