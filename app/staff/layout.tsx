import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Hernandez Pass Staff",
  description: "Scanner de check-in",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HP Staff",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
};

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
