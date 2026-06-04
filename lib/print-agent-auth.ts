export function getPrintAgentToken(): string | null {
  const token = process.env.PRINT_AGENT_TOKEN?.trim();
  return token || null;
}

export function isPrintAgentAuthorized(request: Request): boolean {
  const expected = getPrintAgentToken();
  if (!expected) return false;

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7).trim() === expected;
  }

  const header = request.headers.get("x-print-agent-token");
  return header?.trim() === expected;
}
