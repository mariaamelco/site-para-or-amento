"use client";

import { useEffect, type ReactNode } from "react";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Mode } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  /** Prévia exibida em tela cheia. */
  children: ReactNode;
}

/**
 * No celular a prévia fica em tela cheia, aberta por um botão flutuante.
 * Assim dá para alternar entre o formulário e o PDF sem rolar a página.
 */
export function MobilePreview({ open, onOpenChange, mode, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onOpenChange]);

  return (
    <>
      <Button
        type="button"
        className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 h-12 rounded-full bg-neutral-900 px-4 text-white shadow-lg hover:bg-neutral-800 lg:hidden"
        onClick={() => onOpenChange(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <FileText />
        Ver prévia do PDF
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Prévia do documento"
          className="fixed inset-0 z-50 flex flex-col bg-neutral-100 lg:hidden"
        >
          <div className="flex items-center justify-between gap-2 border-b bg-white px-4 py-3">
            <p className="flex items-center gap-2 text-[14px] font-semibold">
              <FileText className="size-4 text-brand" />
              Prévia do {mode === "orc" ? "orçamento" : "recibo"}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              autoFocus
              onClick={() => onOpenChange(false)}
            >
              <X />
              Voltar ao formulário
            </Button>
          </div>
          <div className="min-h-0 flex-1 p-3">{children}</div>
        </div>
      ) : null}
    </>
  );
}
