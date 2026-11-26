"use client";

import dynamic from "next/dynamic";

/**
 * O histórico depende do IndexedDB e do `localStorage`, então só pode ser
 * renderizado no navegador.
 */
const HistoryShell = dynamic(
  () => import("./history-shell").then((mod) => mod.HistoryShell),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center py-16 text-sm text-neutral-500">
        Carregando…
      </div>
    ),
  },
);

export default function HistoryPage() {
  return <HistoryShell />;
}
