import { brDate } from "@/lib/format";
import type { BudgetDoc, Mode, ReceiptDoc } from "@/lib/types";

/** Nome do arquivo: "Orçamento - Cliente - dd-mm-aaaa (página 2).pdf" */
export function documentName(
  mode: Mode,
  doc: BudgetDoc | ReceiptDoc,
  extension: string,
  page: number,
  pageCount: number,
): string {
  const kind = mode === "orc" ? "Orçamento" : "Recibo";
  const who = (doc.cliente || "")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const date = brDate(doc.data).replace(/\//g, "-");
  const pageSuffix = pageCount > 1 ? ` (página ${page})` : "";
  return `${kind}${who ? " - " + who : ""} - ${date}${pageSuffix}.${extension}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export type DeliverResult = "shared" | "downloaded" | "cancelled" | "needs-tap";

/**
 * Celular/tablet: usa o compartilhamento do sistema para enviar só o arquivo.
 * (Baixar por link no iPhone abre a tela de compartilhar com o arquivo E o
 * endereço "blob:https://…", e o WhatsApp manda os dois.)
 */
export function prefersShare(files: File[]): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  return touch && typeof navigator.share === "function" && !!navigator.canShare?.({ files });
}

/** Abre a tela de compartilhar só com os arquivos (sem texto nem link). */
export async function shareFiles(files: File[]): Promise<Exclude<DeliverResult, "downloaded">> {
  try {
    await navigator.share({ files });
    return "shared";
  } catch (error) {
    const name = (error as DOMException | undefined)?.name;
    if (name === "AbortError") return "cancelled";
    // O iPhone só abre o compartilhamento logo após um toque; se gerar o
    // arquivo demorou, ele recusa e é preciso tocar de novo num botão.
    if (name === "NotAllowedError") return "needs-tap";
    throw error;
  }
}

/** Entrega os arquivos: compartilha no celular, baixa no computador. */
export async function deliverFiles(files: File[]): Promise<DeliverResult> {
  if (prefersShare(files)) return shareFiles(files);
  for (let index = 0; index < files.length; index++) {
    downloadBlob(files[index], files[index].name);
    if (index < files.length - 1) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return "downloaded";
}

export function toFile(blob: Blob, name: string): File {
  return new File([blob], name, { type: blob.type || "application/octet-stream" });
}
