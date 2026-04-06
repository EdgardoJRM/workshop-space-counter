import type { Metadata } from "next";
import { SpacesForm } from "@/components/admin/SpacesForm";

export const metadata: Metadata = {
  title: "Administración — Espacios",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <SpacesForm />;
}
