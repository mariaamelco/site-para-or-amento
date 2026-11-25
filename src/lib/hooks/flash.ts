"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Destaca um item recém-adicionado por 1,5 s. */
export function useFlash() {
  const [flashId, setFlashId] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const flash = useCallback((id: string) => {
    setFlashId(id);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFlashId(null), 1500);
  }, []);

  return { flashId, flash };
}
