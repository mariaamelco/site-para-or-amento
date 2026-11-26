"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { shareFiles } from "@/lib/document/download";

interface Props {
  files: File[] | null;
  onDone: (result: "shared" | "cancelled") => void;
}

/**
 * Aparece quando o celular recusou abrir o compartilhamento sozinho
 * (o arquivo demorou para ficar pronto). Um toque no botão resolve.
 */
export function ShareFilesDialog({ files, onDone }: Props) {
  const label = files && files.length > 1 ? "Enviar arquivos" : "Enviar arquivo";

  async function handleShare() {
    if (!files) return;
    const result = await shareFiles(files);
    onDone(result === "shared" ? "shared" : "cancelled");
  }

  return (
    <Dialog
      open={files !== null}
      onOpenChange={(open) => {
        if (!open) onDone("cancelled");
      }}
    >
      <DialogContent className="max-w-[92vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Arquivo pronto</DialogTitle>
          <DialogDescription>
            {files?.map((file) => file.name).join(", ")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onDone("cancelled")}>
            Fechar
          </Button>
          <Button onClick={handleShare}>
            <Share2 />
            {label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
