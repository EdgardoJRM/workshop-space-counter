import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClickFunnels Lead CRM",
  description: "Dashboard privado para manejar leads recibidos desde ClickFunnels",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
