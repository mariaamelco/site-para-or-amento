/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  pages: HTMLCanvasElement[] | null;
  onClose: () => void;
}

/** Alternativa para salvar a imagem quando o download/cópia é bloqueado. */
export function ImagesDialog({ pages, onClose }: Props) {
  const urls = useMemo(
    () => (pages ?? []).map((page) => page.toDataURL("image/png")),
    [pages],
  );

  return (
    <Dialog
      open={pages !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-[92vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Imagem do documento</DialogTitle>
          <DialogDescription>
            Toque e segure (ou clique com o botão direito) na imagem e escolha
            “Salvar imagem como…”.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[62vh] gap-3 overflow-auto">
          {urls.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`Página ${index + 1} do documento`}
              className="w-full rounded-lg ring-1 ring-black/10"
            />
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
