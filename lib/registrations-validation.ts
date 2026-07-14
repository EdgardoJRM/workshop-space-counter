/** Valida que la fecha del taller pertenezca a la organización esperada. */
export function validateWorkshopDateOrganization(input: {
  organizationId?: string;
  workshopOrgId: string;
}): { ok: true } | { ok: false; code: "ORG_MISMATCH"; error: string } {
  if (
    input.organizationId &&
    input.workshopOrgId !== input.organizationId
  ) {
    return {
      ok: false,
      code: "ORG_MISMATCH",
      error: "La fecha del taller no pertenece a esta organización",
    };
  }
  return { ok: true };
}
