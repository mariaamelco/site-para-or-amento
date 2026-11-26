"use client";

import { useCallback, useState } from "react";
import { renewDocumentId, storedDocumentId } from "@/lib/history-store";

/**
 * Id do documento em edição: criado na primeira visita e renovado a cada
 * "Novo documento", para o histórico não duplicar o mesmo orçamento.
 */
export function useDocumentId() {
  const [id, setId] = useState<string>(storedDocumentId);

  const renew = useCallback(() => setId(renewDocumentId()), []);

  return { id, renew };
}
