import { redirect } from "next/navigation";

export default function StaffLoginRedirect() {
  redirect("/login?intent=staff&next=/staff/scan");
}
