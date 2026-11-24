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
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-sm text-white/60">
        Carregando…
      </div>
    ),
  },
);

export function AppClient() {
  return <AppShell />;
}
