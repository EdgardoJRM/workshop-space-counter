import type { Metadata, Viewport } from "next";
import Image from "next/image";
import { PassScreenEnhancer } from "@/components/pass/PassScreenEnhancer";

export const metadata: Metadata = {
  title: "Mi pase — Hernandez Pass",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function PassLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PassScreenEnhancer />
      <header className="flex shrink-0 justify-center px-4 pt-8 pb-2">
        <Image
          src="/Logo Edgardo hernandez 2025 Azul.png"
          alt="Edgardo Hernandez"
          width={220}
          height={56}
          priority
          className="h-10 w-auto"
        />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
