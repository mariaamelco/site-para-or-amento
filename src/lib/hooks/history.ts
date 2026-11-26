"use client";

import { useEffect, useState } from "react";
import { listHistoryEntries } from "@/lib/history-store";
import type { HistoryEntry } from "@/lib/types";

/**
 * Documentos salvos no histórico, já sem os expirados (30 dias). `entries` é
 * `null` enquanto o IndexedDB não respondeu.
 */
export function useHistoryEntries() {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    listHistoryEntries()
      .then((rows) => {
        if (!alive) return;
        setEntries(rows);
        setFailed(false);
      })
      .catch(() => {
        if (!alive) return;
        setEntries([]);
        setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { entries, loading: entries === null, failed };
}
