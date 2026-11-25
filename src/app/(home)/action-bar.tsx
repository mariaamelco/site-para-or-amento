"use client";

import { Copy, Download, FileImage, FileText, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Notice } from "@/lib/types";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";

interface Props {
  busy: boolean;
  /** `false` quando o formulário do documento tem campos inválidos. */
  isValid: boolean;
  notice: Notice;
  resetArmed: boolean;
  onDownloadPdf: () => void;
  onDownloadPng: () => void;
  onCopy: () => void;
  onReset: () => void;
}

export function ActionBar({
  busy,
  isValid,
  notice,
  resetArmed,
  onDownloadPdf,
  onDownloadPng,
  onCopy,
  onReset,
}: Props) {
  return (
    <Card>
      <CardContent className="grid gap-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            className="h-10 bg-neutral-900 text-white hover:bg-neutral-800"
            disabled={busy || !isValid}
            onClick={onDownloadPdf}
          >
            <FileText />
            Baixar PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            disabled={busy || !isValid}
            onClick={onDownloadPng}
          >
            <FileImage />
            Baixar imagem (PNG)
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            disabled={busy || !isValid}
            onClick={onCopy}
          >
            <Copy />
            Copiar imagem
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-10",
              resetArmed && "border-brand text-brand hover:bg-brand/5",
            )}
            disabled={busy}
            onClick={onReset}
          >
            <RotateCcw />
            {resetArmed ? "Clique de novo para limpar" : "Novo documento"}
          </Button>
        </div>
        <div className="flex items-start gap-2">
          <Download className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p
            role="status"
            aria-live="polite"
            className={cn(
              "min-h-[18px] flex-1 text-[12.5px]",
              notice.kind === "err"
                ? "text-brand"
                : notice.kind === "ok"
                  ? "text-emerald-600"
                  : "text-muted-foreground",
            )}
          >
            {notice.text ||
              (isValid
                ? "O PDF sai em A4, com as fotos dos produtos e a assinatura."
                : "Complete os dados do documento para exportar.")}
          </p>
          <span className="shrink-0 text-[11.5px] text-muted-foreground" title="Versão do sistema">
            v{APP_VERSION}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
