export type Mode = "orc" | "rec";

export type TotMode = "auto" | "man";

export interface BudgetItem {
  id: string;
  slug?: string;
  desc: string;
  qty: string;
  unit: string;
}

export interface BudgetDoc {
  cliente: string;
  /** Data de emissão no formato ISO (yyyy-mm-dd). */
  data: string;
  cnpjOn: boolean;
  cnpj: string;
  items: BudgetItem[];
  unitCol: boolean;
  colTitle: string;
  obs: string;
  totMode: TotMode;
  totManual: string;
  photos: boolean;
}

export interface ReceiptItem {
  id: string;
  desc: string;
  valor: string;
}

export interface ReceiptDoc {
  cliente: string;
  data: string;
  cnpjOn: boolean;
  cnpj: string;
  items: ReceiptItem[];
}

export interface CatalogProduct {
  name: string;
  slug: string;
  cat: string;
  /** Nome normalizado usado na busca. */
  key: string;
}

export type PriceMemo = Record<string, string>;

export type NoticeKind = "" | "ok" | "err";

export interface Notice {
  text: string;
  kind: NoticeKind;
}

export interface SignatureSettings {
  raw: string | null;
  clean: boolean;
  name: string;
}
