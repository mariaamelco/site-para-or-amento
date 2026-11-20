import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "J&M System — Orçamentos e Recibos",
  description:
    "Monte orçamentos e recibos em PDF com fotos dos produtos, assinatura e catálogo de equipamentos.",
  applicationName: "J&M System",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
