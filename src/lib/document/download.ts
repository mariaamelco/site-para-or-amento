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
