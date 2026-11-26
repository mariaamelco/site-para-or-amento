"use client";

import { useEffect, useState } from "react";
import { ensureHeaderImage } from "@/lib/document/assets";
import type { LoadedImage } from "@/lib/document/canvas";

/** Cabeçalho J&M usado nos documentos, carregado uma vez. */
export function useHeaderImage(): LoadedImage | null {
  const [header, setHeader] = useState<LoadedImage | null>(null);

  useEffect(() => {
    let alive = true;
    ensureHeaderImage().then((image) => {
      if (alive) setHeader(image);
    });
    return () => {
      alive = false;
    };
  }, []);

  return header;
}
