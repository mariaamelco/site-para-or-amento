import { newId, todayISO } from "@/lib/format";
import type { BudgetDoc, ReceiptDoc } from "@/lib/types";

export const defaultBudget = (): BudgetDoc => ({
  cliente: "",
  data: todayISO(),
  cnpjOn: false,
  cnpj: "",
  items: [],
  unitCol: false,
  colTitle: "DESCRIÇÃO",
  obs: "",
  totMode: "auto",
  totManual: "",
  photos: true,
});

export const defaultReceipt = (): ReceiptDoc => ({
  cliente: "",
  data: todayISO(),
  cnpjOn: false,
  cnpj: "",
  items: [{ id: newId(), desc: "", valor: "" }],
});
