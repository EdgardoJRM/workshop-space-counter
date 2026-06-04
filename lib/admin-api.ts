import { isAdminAuthorized } from "@/lib/auth";

export async function assertAdminApiAccess(
  legacyToken?: string | null
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const allowed = await isAdminAuthorized(legacyToken ?? undefined);
  if (!allowed) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true };
}
