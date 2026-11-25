"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Receipt, FileText } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionBar } from "./action-bar";
import { BudgetForm } from "./budget-form";
import { ImagesDialog } from "./images-dialog";
import { MobilePreview } from "./mobile-preview";
import { ReceiptForm } from "./receipt-form";
import { useCatalog } from "@/lib/hooks/catalog";
import { useDesktopPreview } from "@/lib/hooks/desktop-preview";
import { useFlash } from "@/lib/hooks/flash";
import { useHeaderImage } from "@/lib/hooks/header-image";
import { usePersistedState } from "@/lib/hooks/persisted-state";
import { useSignatureImage } from "@/lib/hooks/signature-image";
import { canvasToBlob, type LoadedImage } from "@/lib/document/canvas";
import { ensureHeaderImage, ensureFonts } from "@/lib/document/assets";
import { COMPANY, EXPORT_SCALE, PW } from "@/lib/document/constants";
import { documentName, downloadBlob } from "@/lib/document/download";
import { ensurePhotos, setPhotoListener } from "@/lib/document/photos";
import { buildPDF } from "@/lib/document/pdf";
import { renderPages } from "@/lib/document/render";
import { defaultBudget, defaultReceipt } from "@/lib/documents";
import type {
  BudgetDoc,
  Mode,
  Notice,
  PriceMemo,
  ReceiptDoc,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface DocumentPreviewProps {
  mode: Mode;
  orc: BudgetDoc;
  rec: ReceiptDoc;
  header: LoadedImage | null;
  signature: LoadedImage | null;
  signerName: string;
  /** Ocupa toda a altura do container (usado na prévia em tela cheia). */
  fill?: boolean;
}

/**
 * Prévia do documento A4. Os canvases são criados fora do React
 * (renderPages) e apenas anexados ao container.
 */
function DocumentPreview({
  mode,
  orc,
  rec,
  header,
  signature,
  signerName,
  fill = false,
}: DocumentPreviewProps) {
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
    <div
      className={cn(
        fill ? "flex h-full min-h-0 flex-col" : "lg:sticky lg:top-4",
      )}
    >
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
        className={cn(
          "doc-pages overflow-auto rounded-xl bg-neutral-200/70 p-3 ring-1 ring-black/5",
          fill ? "min-h-0 flex-1" : "max-h-[calc(100vh-130px)]",
        )}
      />
    </div>
  );
}

const EMPTY_NOTICE: Notice = { text: "", kind: "" };

export function AppShell() {
  const [mode, setMode] = usePersistedState<Mode>("jm_mode", (saved) =>
    saved === "rec" ? "rec" : "orc",
  );
  const [orc, setOrc] = usePersistedState<BudgetDoc>("jm_orc", (saved) =>
    saved && Array.isArray(saved.items)
      ? { ...defaultBudget(), ...saved }
      : defaultBudget(),
  );
  const [rec, setRec] = usePersistedState<ReceiptDoc>("jm_rec", (saved) =>
    saved && Array.isArray(saved.items)
      ? { ...defaultReceipt(), ...saved, items: saved.items }
      : defaultReceipt(),
  );
  const [priceMemo, setPriceMemo] = usePersistedState<PriceMemo>(
    "jm_prices",
    (saved) => saved ?? {},
  );

  const [sigRaw, setSigRaw] = usePersistedState<string | null>(
    "jm_sig_raw",
    (saved) => (typeof saved === "string" && saved ? saved : null),
  );
  const [sigClean, setSigClean] = usePersistedState<boolean>(
    "jm_sig_clean",
    (saved) => saved !== false,
  );
  const [sigName, setSigName] = usePersistedState<string>(
    "jm_sig_name",
    (saved) => saved || COMPANY.signer,
  );
  const {
    image: signature,
    notice: sigNotice,
    setNotice: setSigNotice,
  } = useSignatureImage(sigRaw, sigClean);

  const header = useHeaderImage();
  const { products, loading: catalogLoading, failed: catalogFailed } =
    useCatalog();
  const { desktop, previewOpen, setPreviewOpen } = useDesktopPreview();
  const { flashId, flash } = useFlash();

  const [notice, setNotice] = useState<Notice>(EMPTY_NOTICE);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const [images, setImages] = useState<HTMLCanvasElement[] | null>(null);

  const armTimer = useRef<number | null>(null);

  const showNotice = useCallback((text: string, kind: Notice["kind"] = "") => {
    setNotice({ text, kind });
  }, []);

  function focusField(id: string) {
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  }

  function validate(): boolean {
    if (mode === "orc") {
      if (!orc.cliente.trim()) {
        showNotice("Preencha o nome do cliente.", "err");
        focusField("o-cliente");
        return false;
      }
      if (!orc.items.length) {
        showNotice("Adicione pelo menos um item ao orçamento.", "err");
        return false;
      }
    } else {
      if (!rec.cliente.trim()) {
        showNotice("Preencha o nome do cliente.", "err");
        focusField("r-cliente");
        return false;
      }
      if (!rec.items.length) {
        showNotice("Adicione pelo menos um item ao recibo.", "err");
        return false;
      }
    }
    return true;
  }

  async function renderExportPages(): Promise<HTMLCanvasElement[]> {
    await ensureFonts();
    const head = header ?? (await ensureHeaderImage());
    const withPhotos = mode === "orc" && orc.photos;
    await ensurePhotos(mode === "orc" ? orc.items : [], withPhotos);
    return renderPages(
      { mode, orc, rec, header: head, signature, signerName: sigName },
      EXPORT_SCALE,
    );
  }

  const currentDoc = mode === "orc" ? orc : rec;

  async function handleDownloadPdf() {
    if (busy || !validate()) return;
    setBusy(true);
    showNotice("Gerando PDF…");
    try {
      const pages = await renderExportPages();
      const blob = await buildPDF(pages);
      const name = documentName(mode, currentDoc, "pdf", 1, pages.length);
      downloadBlob(blob, name);
      showNotice(`Arquivo baixado: ${name}`, "ok");
    } catch {
      showNotice("Não foi possível gerar o PDF. Tente novamente.", "err");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadPng() {
    if (busy || !validate()) return;
    setBusy(true);
    showNotice("Gerando imagem…");
    try {
      const pages = await renderExportPages();
      const names: string[] = [];
      for (let index = 0; index < pages.length; index++) {
        const blob = await canvasToBlob(pages[index], "image/png");
        const name = documentName(mode, currentDoc, "png", index + 1, pages.length);
        downloadBlob(blob, name);
        names.push(name);
        if (index < pages.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }
      showNotice(
        names.length === 1
          ? `Arquivo baixado: ${names[0]}`
          : `${names.length} arquivos baixados.`,
        "ok",
      );
    } catch {
      showNotice("Não foi possível gerar a imagem. Tente novamente.", "err");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyImage() {
    if (busy || !validate()) return;
    setBusy(true);
    showNotice("Copiando imagem…");
    let pages: HTMLCanvasElement[] = [];
    try {
      pages = await renderExportPages();
      const blob = await canvasToBlob(pages[0], "image/png");
      if (
        typeof ClipboardItem !== "undefined" &&
        navigator.clipboard &&
        "write" in navigator.clipboard
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        showNotice(
          "Imagem copiada. Agora é só colar no WhatsApp.",
          "ok",
        );
      } else {
        setImages(pages);
        showNotice("Toque e segure na imagem para salvar.", "ok");
      }
    } catch {
      if (pages.length) setImages(pages);
      showNotice("Copie a imagem pela janela que abriu.", "err");
    } finally {
      setBusy(false);
    }
  }

  function handleReset() {
    if (busy) return;
    if (!armed) {
      setArmed(true);
      if (armTimer.current) window.clearTimeout(armTimer.current);
      armTimer.current = window.setTimeout(() => setArmed(false), 4000);
      return;
    }
    setArmed(false);
    if (armTimer.current) window.clearTimeout(armTimer.current);
    if (mode === "orc") {
      setOrc(defaultBudget());
    } else {
      setRec(defaultReceipt());
    }
    showNotice("Formulário limpo.", "ok");
    focusField(mode === "orc" ? "o-cliente" : "r-cliente");
  }

  function handleModeChange(value: string) {
    setMode(value === "rec" ? "rec" : "orc");
    setNotice(EMPTY_NOTICE);
    setArmed(false);
  }

  return (
    <>
      <main className="mx-auto w-full max-w-[1280px] px-4 py-4">
        <nav aria-label="Tipo de documento" className="mb-4">
          <Tabs value={mode} onValueChange={handleModeChange} className="gap-0">
            <TabsList className="h-10 w-full rounded-lg bg-white p-1 shadow-sm ring-1 ring-black/5 sm:w-auto">
              <TabsTrigger
                value="orc"
                className="h-8 gap-2 px-4 text-neutral-500 data-active:bg-neutral-900 data-active:text-white"
              >
                <FileText className="size-3.5" />
                Fazer orçamento
              </TabsTrigger>
              <TabsTrigger
                value="rec"
                className="h-8 gap-2 px-4 text-neutral-500 data-active:bg-neutral-900 data-active:text-white"
              >
                <Receipt className="size-3.5" />
                Fazer recibo
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </nav>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)]">
          <div className="order-2 grid gap-3 pb-16 lg:order-1 lg:pb-0">
            {mode === "orc" ? (
              <BudgetForm
                doc={orc}
                setDoc={setOrc}
                products={products}
                loading={catalogLoading}
                failed={catalogFailed}
                priceMemo={priceMemo}
                setPriceMemo={setPriceMemo}
                flashId={flashId}
                flash={flash}
                onNotice={showNotice}
              />
            ) : (
              <ReceiptForm
                doc={rec}
                setDoc={setRec}
                flashId={flashId}
                flash={flash}
                signature={{
                  raw: sigRaw,
                  setRaw: setSigRaw,
                  clean: sigClean,
                  setClean: setSigClean,
                  name: sigName,
                  setName: setSigName,
                  notice: sigNotice,
                  setNotice: setSigNotice,
                }}
              />
            )}

            <ActionBar
              busy={busy}
              notice={notice}
              resetArmed={armed}
              onDownloadPdf={handleDownloadPdf}
              onDownloadPng={handleDownloadPng}
              onCopy={handleCopyImage}
              onReset={handleReset}
            />
          </div>

          {desktop ? (
            <div className="order-1 lg:order-2">
              <DocumentPreview
                mode={mode}
                orc={orc}
                rec={rec}
                header={header}
                signature={signature}
                signerName={sigName}
              />
            </div>
          ) : null}
        </div>
      </main>

      {desktop ? null : (
        <MobilePreview
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          mode={mode}
        >
          <DocumentPreview
            mode={mode}
            orc={orc}
            rec={rec}
            header={header}
            signature={signature}
            signerName={sigName}
            fill
          />
        </MobilePreview>
      )}

      <ImagesDialog pages={images} onClose={() => setImages(null)} />
    </>
  );
}
