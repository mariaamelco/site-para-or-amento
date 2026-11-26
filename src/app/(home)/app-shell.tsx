"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Receipt, FileText } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionBar } from "./action-bar";
import { BudgetForm } from "./budget-form";
import { ImagesDialog } from "./images-dialog";
import { MobilePreview } from "./mobile-preview";
import { ReceiptForm } from "./receipt-form";
import { useCatalog } from "@/lib/hooks/catalog";
import { useDesktopPreview } from "@/lib/hooks/desktop-preview";
import { useDocumentId } from "@/lib/hooks/document-id";
import { useFlash } from "@/lib/hooks/flash";
import { useHeaderImage } from "@/lib/hooks/header-image";
import { usePersistedState } from "@/lib/hooks/persisted-state";
import { useSignatureImage } from "@/lib/hooks/signature-image";
import { canvasToBlob, type LoadedImage } from "@/lib/document/canvas";
import { ensureFonts } from "@/lib/document/assets";
import { getCompany, type CompanyId } from "@/lib/companies";
import { PW } from "@/lib/document/constants";
import {
  deliverFiles,
  documentName,
  toFile,
  type DeliverResult,
} from "@/lib/document/download";
import { ShareFilesDialog } from "@/components/share-files-dialog";
import { renderExportPages as renderPagesForExport } from "@/lib/document/export";
import { buildPDF } from "@/lib/document/pdf";
import { setPhotoListener } from "@/lib/document/photos";
import { renderPages } from "@/lib/document/render";
import { defaultBudget, defaultReceipt } from "@/lib/documents";
import { formErrors, formIsValid } from "@/lib/form";
import { saveHistoryEntry } from "@/lib/history-store";
import { budgetFormSchema, validateBudgetItems } from "@/lib/schemas/budget";
import { receiptFormSchema } from "@/lib/schemas/receipt";
import { STORAGE_KEYS, signatureKeys } from "@/lib/storage";
import type {
  BudgetDoc,
  Mode,
  Notice,
  PriceMemo,
  ReceiptDoc,
  SignatureSettings,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface DocumentPreviewProps {
  mode: Mode;
  orc: BudgetDoc;
  rec: ReceiptDoc;
  header: LoadedImage | null;
  signature: LoadedImage | null;
  signerName: string;
  company: CompanyId;
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
  company,
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
        { mode, orc, rec, header, signature, signerName, company },
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
  }, [mode, orc, rec, header, signature, signerName, company, tick]);

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

/**
 * `company` vem da página, que remonta o shell ao trocar de empresa: a
 * assinatura é lida das chaves da empresa nova.
 */
export function AppShell({ company }: { company: CompanyId }) {
  const sigKeys = signatureKeys(company);
  const [mode, setMode] = usePersistedState<Mode>(STORAGE_KEYS.mode, (saved) =>
    saved === "rec" ? "rec" : "orc",
  );
  const [orc, setOrc] = usePersistedState<BudgetDoc>(STORAGE_KEYS.budget, (saved) =>
    saved && Array.isArray(saved.items)
      ? { ...defaultBudget(), ...saved }
      : defaultBudget(),
  );
  const [rec, setRec] = usePersistedState<ReceiptDoc>(STORAGE_KEYS.receipt, (saved) =>
    saved && Array.isArray(saved.items)
      ? { ...defaultReceipt(), ...saved, items: saved.items }
      : defaultReceipt(),
  );
  const [priceMemo, setPriceMemo] = usePersistedState<PriceMemo>(
    STORAGE_KEYS.prices,
    (saved) => saved ?? {},
  );

  const [sigRaw, setSigRaw] = usePersistedState<string | null>(
    sigKeys.raw,
    (saved) => (typeof saved === "string" && saved ? saved : null),
  );
  const [sigClean, setSigClean] = usePersistedState<boolean>(
    sigKeys.clean,
    (saved) => saved !== false,
  );
  const [sigName, setSigName] = usePersistedState<string>(
    sigKeys.name,
    (saved) => saved || getCompany(company).signer,
  );
  const {
    image: signature,
    notice: sigNotice,
    setNotice: setSigNotice,
  } = useSignatureImage(sigRaw, sigClean);

  const header = useHeaderImage(company);
  const { products, loading: catalogLoading, failed: catalogFailed } =
    useCatalog();
  const { desktop, previewOpen, setPreviewOpen } = useDesktopPreview();
  const { flashId, flash } = useFlash();

  const [notice, setNotice] = useState<Notice>(EMPTY_NOTICE);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const [images, setImages] = useState<HTMLCanvasElement[] | null>(null);
  /** Arquivos esperando um toque para abrir o compartilhamento do celular. */
  const [pendingShare, setPendingShare] = useState<File[] | null>(null);
  const { id: documentId, renew: renewDocumentId } = useDocumentId();

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
      const items = validateBudgetItems(orc.items);
      if (!items.ok) {
        showNotice(items.message, "err");
        if (items.fieldId) focusField(items.fieldId);
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
    return renderPagesForExport({
      mode,
      orc,
      rec,
      header,
      signature,
      signerName: sigName,
      company,
    });
  }

  /**
   * Guarda o documento no histórico. É chamado a cada exportação; o id do
   * documento evita duplicar a entrada quando a pessoa exporta duas vezes.
   */
  async function saveToHistory() {
    const signature: SignatureSettings = {
      raw: sigRaw,
      clean: sigClean,
      name: sigName,
    };

    try {
      if (mode === "orc") {
        await saveHistoryEntry({
          id: documentId,
          mode: "orc",
          doc: orc,
          signature,
          company,
        });
      } else {
        await saveHistoryEntry({
          id: documentId,
          mode: "rec",
          doc: rec,
          signature,
          company,
        });
      }
    } catch {
      // O histórico é um extra: sem IndexedDB a exportação continua funcionando.
    }
  }

  const currentDoc = mode === "orc" ? orc : rec;
  const orcErrors = useMemo(() => formErrors(budgetFormSchema, orc), [orc]);
  const recErrors = useMemo(() => formErrors(receiptFormSchema, rec), [rec]);
  /** Habilita a exportação: o documento atual precisa estar sem erros. */
  const formValid =
    mode === "orc" ? formIsValid(orcErrors) : formIsValid(recErrors);

  /** Mensagem depois de baixar/compartilhar; no celular pode pedir mais um toque. */
  function reportDelivery(result: DeliverResult, files: File[]) {
    const what = files.length === 1 ? files[0].name : `${files.length} arquivos`;
    if (result === "downloaded") {
      showNotice(
        files.length === 1 ? `Arquivo baixado: ${what}` : `${what} baixados.`,
        "ok",
      );
    } else if (result === "shared") {
      showNotice(`Enviado: ${what}`, "ok");
    } else if (result === "cancelled") {
      showNotice("Envio cancelado.");
    } else {
      showNotice(`Pronto: ${what}. Toque em “Enviar arquivo”.`);
      setPendingShare(files);
    }
  }

  async function handleDownloadPdf() {
    if (busy || !validate()) return;
    setBusy(true);
    showNotice("Gerando PDF…");
    try {
      const pages = await renderExportPages();
      const blob = await buildPDF(pages);
      const name = documentName(mode, currentDoc, "pdf", 1, pages.length);
      const files = [toFile(blob, name)];
      const result = await deliverFiles(files);
      await saveToHistory();
      reportDelivery(result, files);
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
      const files: File[] = [];
      for (let index = 0; index < pages.length; index++) {
        const blob = await canvasToBlob(pages[index], "image/png");
        const name = documentName(mode, currentDoc, "png", index + 1, pages.length);
        files.push(toFile(blob, name));
      }
      const result = await deliverFiles(files);
      await saveToHistory();
      reportDelivery(result, files);
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
        await saveToHistory();
        showNotice(
          "Imagem copiada. Agora é só colar no WhatsApp.",
          "ok",
        );
      } else {
        setImages(pages);
        await saveToHistory();
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
    renewDocumentId();
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
              isValid={formValid}
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
                company={company}
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
            company={company}
            fill
          />
        </MobilePreview>
      )}

      <ImagesDialog pages={images} onClose={() => setImages(null)} />
      <ShareFilesDialog
        files={pendingShare}
        onDone={(result) => {
          const files = pendingShare ?? [];
          setPendingShare(null);
          reportDelivery(result, files);
        }}
      />
    </>
  );
}
