import { resolvePrintAgentAuth } from "@/lib/printer-pairing";

export { resolvePrintAgentAuth };

export async function isPrintAgentAuthorized(
  request: Request
): Promise<{ organizationId: string } | null> {
  return resolvePrintAgentAuth(request);
}
