"use client";

import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { renderPages } from "@/lib/document/render";
import { setPhotoListener } from "@/lib/document/photos";
import { ensureFonts } from "@/lib/document/assets";
import { PW } from "@/lib/document/constants";
import type { LoadedImage } from "@/lib/document/canvas";
import type { BudgetDoc, Mode, ReceiptDoc } from "@/lib/types";

interface Props {
  mode: Mode;
  orc: BudgetDoc;
  rec: ReceiptDoc;
  header: LoadedImage | null;
  signature: LoadedImage | null;
  signerName: string;
}

/**
 * Prévia do documento A4. Os canvases são criados fora do React
 * (renderPages) e apenas anexados ao container.
 */
export function DocumentPreview({
  mode,
  orc,
  rec,
  header,
  signature,
  signerName,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  const [pagesLabel, setPagesLabel] = useState("A4 · 1 página");

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    setPhotoListener(bump);
    let alive = true;
    ensureFonts().then(() => {
      if (alive) bump();
    });
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(bump, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      setPhotoListener(null);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const frame = requestAnimationFrame(() => {
      const width = Math.min(host.clientWidth || 600, 660);
      const ratio = window.devicePixelRatio || 1;
      const scale = Math.max(1.2, (width * ratio) / PW);
      const canvases = renderPages(
        { mode, orc, rec, header, signature, signerName },
        scale,
      );
      canvases.forEach((canvas, index) => {
        canvas.className = "doc-page";
        canvas.setAttribute("role", "img");
        canvas.setAttribute(
          "aria-label",
          `Prévia do documento — página ${index + 1}`,
        );
      });
      host.replaceChildren(...canvases);
      setPagesLabel(
        canvases.length > 1 ? `${canvases.length} páginas` : "A4 · 1 página",
      );
    });

    return () => cancelAnimationFrame(frame);
  }, [mode, orc, rec, header, signature, signerName, tick]);

  return (
    <div className="lg:sticky lg:top-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
          <FileText className="size-4" />
          Prévia do {mode === "orc" ? "orçamento" : "recibo"}
        </p>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11.5px] font-medium text-muted-foreground">
          {pagesLabel}
        </span>
      </div>
      <div
        ref={hostRef}
        className="doc-pages max-h-[calc(100vh-130px)] overflow-auto rounded-xl bg-neutral-200/70 p-3 ring-1 ring-black/5"
      />
    </div>
  );
}
