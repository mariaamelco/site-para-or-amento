"use client";

import { useEffect, useState } from "react";

/**
 * Prévia lateral no desktop e em tela cheia no celular. Ao voltar para o
 * desktop, a tela cheia é fechada.
 */
export function useDesktopPreview() {
  const [desktop, setDesktop] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.matchMedia("(min-width: 1024px)").matches,
  );
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => {
      setDesktop(media.matches);
      if (media.matches) setPreviewOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return { desktop, previewOpen, setPreviewOpen };
}
