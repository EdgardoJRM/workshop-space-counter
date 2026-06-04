import {
  clearSessionCookie,
  getSession,
  requireStaffSession,
  setSessionCookie,
} from "@/lib/auth";

export async function isStaffAuthenticated(): Promise<boolean> {
  const session = await requireStaffSession();
  return session !== null;
}

export { clearSessionCookie as clearStaffCookie, setSessionCookie as setStaffCookie, getSession };
