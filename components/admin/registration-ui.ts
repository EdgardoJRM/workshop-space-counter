export function registrationInitials(
  name: string | null | undefined,
  email: string
): string {
  const n = name?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function registrationStatusLabel(input: {
  status: string;
  checkedIn: boolean;
}): string {
  if (input.status === "CANCELLED") return "Cancelado";
  if (input.checkedIn) return "Check-in";
  return "Pendiente";
}
