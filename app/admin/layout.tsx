import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Administración — Hernandez Pass",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminSession();
  if (!session) {
    redirect("/login?intent=admin&next=/admin");
  }
  return children;
}
