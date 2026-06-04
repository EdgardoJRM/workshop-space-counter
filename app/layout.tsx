import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hernandez Pass",
  description: "Pases, registros y contador de espacios para talleres",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <header className="sticky top-0 z-50 border-b border-brand-grey/20 bg-white/70 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/Logo Edgardo hernandez 2025 Azul.png"
                alt="Edgardo Hernandez"
                width={180}
                height={48}
                priority
                className="h-8 w-auto"
              />
            </Link>
            <div className="ml-auto flex items-center gap-4 text-xs font-medium text-brand-charcoal">
              <a href="/login?intent=admin" className="hover:text-brand-blue">
                Admin
              </a>
              <a href="/login?intent=staff" className="hover:text-brand-blue">
                Staff
              </a>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
