import Dexie, { type Table } from "dexie";

import { historyEntryFrom, type HistoryDraft } from "@/lib/history";
import {
  HISTORY_TTL_MS,
  historyEntryExpired,
  historyEntrySchema,
} from "@/lib/schemas/history";
import { parseCompanyId } from "@/lib/schemas/company";
import { STORAGE_KEYS, saveCompany, saveJSON, signatureKeys } from "@/lib/storage";
import type { HistoryEntry, Mode } from "@/lib/types";

const DB_NAME = "jm_history";

/** O mesmo documento pode ter um orçamento e um recibo: a chave é composta. */
type HistoryKey = [Mode, string];

class HistoryDatabase extends Dexie {
  entries!: Table<HistoryEntry, HistoryKey>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({ entries: "[mode+id], savedAt" });
  }
}

let database: HistoryDatabase | null = null;

function db(): HistoryDatabase {
  if (!database) database = new HistoryDatabase();
  return database;
}

/** Id novo para cada documento; evita que o mesmo orçamento apareça duas vezes. */
export function newDocumentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Grava o id do documento em edição e devolve o id gravado. */
export function renewDocumentId(): string {
  const id = newDocumentId();
  try {
    localStorage.setItem(STORAGE_KEYS.documentId, id);
  } catch {
    // armazenamento bloqueado: o id vale só para esta sessão
  }
  return id;
}

/** Id do documento em edição; criado na primeira visita. */
export function storedDocumentId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.documentId);
    if (saved) return saved;
  } catch {
    // armazenamento bloqueado: cai no id novo abaixo
  }
  return renewDocumentId();
}

/** Remove do banco o que já passou dos 30 dias. */
export async function pruneHistoryEntries(now = Date.now()): Promise<number> {
  const cutoff = new Date(now - HISTORY_TTL_MS).toISOString();
  return db().entries.where("savedAt").below(cutoff).delete();
}

/** Grava (ou atualiza) o documento atual no histórico. */
export async function saveHistoryEntry(
  draft: HistoryDraft,
): Promise<HistoryEntry> {
  const entry = historyEntryFrom(draft);
  await pruneHistoryEntries();
  await db().entries.put(entry);
  return entry;
}

/** Entradas válidas, das mais recentes para as mais antigas. */
export async function listHistoryEntries(): Promise<HistoryEntry[]> {
  await pruneHistoryEntries();
  const rows = await db().entries.orderBy("savedAt").reverse().toArray();

  return rows.flatMap((row) => {
    const parsed = historyEntrySchema.safeParse(row);
    if (!parsed.success || historyEntryExpired(parsed.data)) return [];
    return [parsed.data];
  });
}

/**
 * Devolve a entrada ao estado do app: o documento, a assinatura e o id atual
 * voltam para o `localStorage` antes da navegação para a tela inicial.
 */
export function restoreHistoryEntry(entry: HistoryEntry): void {
  saveJSON(STORAGE_KEYS.mode, entry.mode);
  saveJSON(
    entry.mode === "orc" ? STORAGE_KEYS.budget : STORAGE_KEYS.receipt,
    entry.doc,
  );
  // A assinatura volta para a empresa do documento, que passa a ser a escolhida.
  const company = parseCompanyId(entry.company);
  const keys = signatureKeys(company);
  saveJSON(keys.raw, entry.signature.raw);
  saveJSON(keys.clean, entry.signature.clean);
  saveJSON(keys.name, entry.signature.name);
  saveCompany(company);

  try {
    localStorage.setItem(STORAGE_KEYS.documentId, entry.id);
  } catch {
    // sem o id gravado, o próximo salvamento cria uma entrada nova
  }
}
