"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { loadJSON, saveJSON } from "@/lib/storage";

/**
 * Estado espelhado no `localStorage`: lê uma vez na montagem e grava a cada
 * mudança. `restore` recebe o valor salvo (ou `null`) e devolve o estado inicial.
 */
export function usePersistedState<T>(
  key: string,
  restore: (saved: T | null) => T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() =>
    restore(loadJSON<T | null>(key, null)),
  );

  useEffect(() => {
    saveJSON(key, value);
  }, [key, value]);

  return [value, setValue];
}
