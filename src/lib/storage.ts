/**
 * Chaves do `localStorage`. Não renomeie: são as mesmas da versão antiga e
 * garantir que quem já usava não perca dados.
 */
export const STORAGE_KEYS = {
  mode: "jm_mode",
  budget: "jm_orc",
  receipt: "jm_rec",
  prices: "jm_prices",
  signatureRaw: "jm_sig_raw",
  signatureClean: "jm_sig_clean",
  signatureName: "jm_sig_name",
  documentId: "jm_doc_id",
} as const;

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // armazenamento cheio ou bloqueado: o app continua funcionando sem salvar
  }
}

export function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function writeFlag(key: string, value: boolean): void {
  try {
    if (value) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {
    // ignora
  }
}
