import { parseMoney } from "@/lib/format";
import type { BudgetDoc, ReceiptDoc } from "@/lib/types";

export function budgetTotal(doc: BudgetDoc): number {
  if (doc.totMode === "man") {
    const manual = parseMoney(doc.totManual);
    return Number.isFinite(manual) ? manual : 0;
  }
  let total = 0;
  for (const item of doc.items) {
    const unit = parseMoney(item.unit);
    if (!Number.isFinite(unit)) continue;
    const qty = parseMoney(item.qty);
    total += unit * (Number.isFinite(qty) ? qty : 1);
  }
  return total;
}

export function receiptTotal(doc: ReceiptDoc): number {
  let total = 0;
  for (const item of doc.items) {
    const value = parseMoney(item.valor);
    if (Number.isFinite(value)) total += value;
  }
  return total;
}
