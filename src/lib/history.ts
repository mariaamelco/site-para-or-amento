import { qtyNum } from "@/lib/format";
import { budgetTotal, receiptTotal } from "@/lib/totals";
import type {
  BudgetDoc,
  HistoryEntry,
  ReceiptDoc,
  SignatureSettings,
} from "@/lib/types";

/** Documento pronto para ser salvo: o restante da entrada é derivado dele. */
export type HistoryDraft =
  | { id: string; mode: "orc"; doc: BudgetDoc; signature: SignatureSettings }
  | { id: string; mode: "rec"; doc: ReceiptDoc; signature: SignatureSettings };

/**
 * Monta a entrada do histórico. Cliente, data e total vêm do documento para a
 * lista não precisar abrir o payload de cada card.
 */
export function historyEntryFrom(
  draft: HistoryDraft,
  savedAt = new Date().toISOString(),
): HistoryEntry {
  const base = {
    id: draft.id,
    savedAt,
    cliente: draft.doc.cliente,
    data: draft.doc.data,
    signature: draft.signature,
  };

  return draft.mode === "orc"
    ? { ...base, mode: "orc", doc: draft.doc, total: budgetTotal(draft.doc) }
    : { ...base, mode: "rec", doc: draft.doc, total: receiptTotal(draft.doc) };
}

/**
 * Texto do "Pedir orçamento": uma linha por item, com a quantidade alinhada à
 * direita (ex.: `Acionador manual            2x`).
 */
export function quoteText(doc: BudgetDoc): string {
  const rows = doc.items
    .map((item) => ({
      desc: item.desc.replace(/\s+/g, " ").trim(),
      qty: qtyNum(item.qty) ?? 1,
    }))
    .filter((row) => row.desc);

  if (!rows.length) return "";

  const width = Math.max(...rows.map((row) => row.desc.length));
  return rows
    .map(
      (row) =>
        `${row.desc.padEnd(width + 3)}${String(row.qty).replace(".", ",")}x`,
    )
    .join("\n");
}
