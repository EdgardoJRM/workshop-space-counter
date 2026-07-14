/** Normaliza token de QR/pase para check-in (hp: prefix opcional). */
export function normalizeCheckinToken(token: string): string {
  const trimmed = token.trim();
  return trimmed.startsWith("hp:") ? trimmed.slice(3) : trimmed;
}

/** Valida que el pase corresponda al evento seleccionado por staff. */
export function validateExpectedWorkshopDate(input: {
  passWorkshopDateId: string;
  expectedWorkshopDateId?: string;
}): { ok: true } | { ok: false; code: "WRONG_EVENT"; error: string } {
  if (
    input.expectedWorkshopDateId &&
    input.passWorkshopDateId !== input.expectedWorkshopDateId
  ) {
    return {
      ok: false,
      code: "WRONG_EVENT",
      error: "Este pase es para otro evento. Cambia la fecha arriba.",
    };
  }
  return { ok: true };
}
