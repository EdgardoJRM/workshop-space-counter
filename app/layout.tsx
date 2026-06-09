import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hernandez Pass — Registros, check-in QR y etiquetas",
  description:
    "Hernandez Pass ayuda a equipos de eventos a gestionar registros, pases QR, check-in, cupos y etiquetas para talleres y eventos en vivo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
