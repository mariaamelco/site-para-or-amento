"use client";

import { useEffect, useState } from "react";
import type { LoadedImage } from "@/lib/document/canvas";
import { processSignature } from "@/lib/document/signature";
import type { Notice } from "@/lib/types";

const EMPTY_NOTICE: Notice = { text: "", kind: "" };

type Processed = { raw: string | null; image: LoadedImage | null };

const NOTHING: Processed = { raw: null, image: null };

/** Prepara a assinatura para o canvas e avisa quando a imagem não abre. */
export function useSignatureImage(raw: string | null, clean: boolean) {
  const [processed, setProcessed] = useState<Processed>(NOTHING);
  const [notice, setNotice] = useState<Notice>(EMPTY_NOTICE);

  useEffect(() => {
    if (!raw) return;
    let cancelled = false;
    processSignature(raw, clean)
      .then((image) => {
        if (!cancelled) setProcessed({ raw, image });
      })
      .catch(() => {
        if (cancelled) return;
        setProcessed({ raw, image: null });
        setNotice({
          text: "Não foi possível ler a assinatura. Envie outra imagem.",
          kind: "err",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [raw, clean]);

  // Mantém a imagem anterior enquanto a nova é processada.
  const image = raw && processed.raw === raw ? processed.image : null;

  return { image, notice, setNotice };
}
