import { redirect } from "next/navigation";
import { requireStaffSession } from "@/lib/auth";

export default async function StaffScanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStaffSession();
  if (!session) {
    redirect("/login?intent=staff&next=/staff/scan");
  }
  return children;
}
