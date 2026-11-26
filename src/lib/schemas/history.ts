import { z } from "zod";

import type { HistoryEntry } from "@/lib/types";

/** Os documentos salvos ficam disponíveis por 30 dias. */
export const HISTORY_TTL_DAYS = 30;
export const HISTORY_TTL_MS = HISTORY_TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Estrutura mínima para redesenhar o documento. É de propósito mais tolerante
 * que os schemas de formulário: uma entrada antiga não é descartada por causa
 * de uma regra de valor que já foi válida quando o documento foi exportado.
 */
const budgetDocShape = z.object({
  cliente: z.string(),
  data: z.string(),
  cnpjOn: z.boolean(),
  cnpj: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      slug: z.string().optional(),
      desc: z.string(),
      qty: z.string(),
      unit: z.string(),
    }),
  ),
  unitCol: z.boolean(),
  colTitle: z.string(),
  obs: z.string(),
  totMode: z.enum(["auto", "man"]),
  totManual: z.string(),
  photos: z.boolean(),
});

const receiptDocShape = z.object({
  cliente: z.string(),
  data: z.string(),
  cnpjOn: z.boolean(),
  cnpj: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      desc: z.string(),
      valor: z.string(),
    }),
  ),
});

const signatureShape = z.object({
  raw: z.string().nullable(),
  clean: z.boolean(),
  name: z.string(),
});

const baseShape = {
  id: z.string().min(1),
  savedAt: z.string().min(1),
  cliente: z.string(),
  data: z.string(),
  total: z.number(),
  signature: signatureShape,
};

/** Entrada do histórico: o documento salvo e os dados que o card mostra. */
export const historyEntrySchema: z.ZodType<HistoryEntry> =
  z.discriminatedUnion("mode", [
    z.object({ ...baseShape, mode: z.literal("orc"), doc: budgetDocShape }),
    z.object({ ...baseShape, mode: z.literal("rec"), doc: receiptDocShape }),
  ]);

/** Regra do prazo: a entrada vale por 30 dias a partir da gravação. */
export function historyEntryExpired(
  entry: { savedAt: string },
  now = Date.now(),
): boolean {
  const saved = Date.parse(entry.savedAt);
  if (!Number.isFinite(saved)) return true;
  return now - saved > HISTORY_TTL_MS;
}
