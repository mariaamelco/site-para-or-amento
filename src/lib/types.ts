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

interface HistoryEntryBase {
  /** Id do documento quando foi salvo: salvar de novo atualiza a mesma entrada. */
  id: string;
  /** Momento da gravação (ISO completo); base do prazo de 30 dias. */
  savedAt: string;
  cliente: string;
  /** Data do documento no formato ISO (yyyy-mm-dd). */
  data: string;
  total: number;
  /** Assinatura usada no recibo, necessária para redesenhar o PDF depois. */
  signature: SignatureSettings;
}

/**
 * Documento salvo no histórico. Guarda tudo o que é preciso para gerar o PDF de
 * novo — o arquivo em si nunca é armazenado.
 */
export type HistoryEntry =
  | (HistoryEntryBase & { mode: "orc"; doc: BudgetDoc })
  | (HistoryEntryBase & { mode: "rec"; doc: ReceiptDoc });
