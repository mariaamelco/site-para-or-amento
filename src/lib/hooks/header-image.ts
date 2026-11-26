"use client";

import { useEffect, useState } from "react";
import type { CompanyId } from "@/lib/companies";
import { ensureHeaderImage } from "@/lib/document/assets";
import type { LoadedImage } from "@/lib/document/canvas";

/** Cabeçalho da empresa usado nos documentos, carregado uma vez por empresa. */
export function useHeaderImage(company: CompanyId): LoadedImage | null {
  const [loaded, setLoaded] = useState<{ company: CompanyId; image: LoadedImage | null } | null>(
    null,
  );

  useEffect(() => {
    let alive = true;
    ensureHeaderImage(company).then((image) => {
      if (alive) setLoaded({ company, image });
    });
    return () => {
      alive = false;
    };
  }, [company]);

  // Enquanto o cabeçalho da empresa nova carrega, não mostra o da anterior.
  return loaded?.company === company ? loaded.image : null;
}
