"use client";

import dynamic from "next/dynamic";

/**
 * O app inteiro depende do localStorage (documentos, preços e assinatura),
 * então só pode ser renderizado no navegador.
 */
const AppShell = dynamic(
  () => import("./app-shell").then((mod) => mod.AppShell),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center py-16 text-sm text-neutral-500">
        Carregando…
      </div>
    ),
  },
);

export default function Home() {
  return <AppShell />;
}
