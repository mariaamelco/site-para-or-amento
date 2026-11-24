"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LogOut, Receipt, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionBar } from "./action-bar";
import { BrandLogo } from "@/components/brand-logo";
import { BudgetForm } from "./budget-form";
import { DocumentPreview } from "./document-preview";
import { ImagesDialog } from "./images-dialog";
import { LoginScreen } from "./login-screen";
import { MobilePreview } from "./mobile-preview";
import { ReceiptForm } from "./receipt-form";
import { clearAuth, isAuthenticated } from "@/lib/auth";
import { parseCatalog, type CatalogRow } from "@/lib/catalog";
import { canvasToBlob, type LoadedImage } from "@/lib/document/canvas";
import { ensureHeaderImage, ensureFonts } from "@/lib/document/assets";
import { EXPORT_SCALE } from "@/lib/document/constants";
import { documentName, downloadBlob } from "@/lib/document/download";
import { ensurePhotos } from "@/lib/document/photos";
import { buildPDF } from "@/lib/document/pdf";
import { renderPages } from "@/lib/document/render";
import { processSignature, shrinkSignature } from "@/lib/document/signature";
import { defaultBudget, defaultReceipt } from "@/lib/documents";
import { newId } from "@/lib/format";
import { loadJSON, saveJSON } from "@/lib/storage";
import { COMPANY } from "@/lib/document/constants";
import type {
  BudgetDoc,
  BudgetItem,
  CatalogProduct,
  Mode,
  Notice,
  PriceMemo,
  ReceiptDoc,
  ReceiptItem,
} from "@/lib/types";

const EMPTY_NOTICE: Notice = { text: "", kind: "" };

export function AppShell() {
  const [authed, setAuthed] = useState(() => isAuthenticated());

  const [mode, setMode] = useState<Mode>(() => {
    const saved = loadJSON<Mode>("jm_mode", "orc");
    return saved === "rec" ? "rec" : "orc";
  });
  const [orc, setOrc] = useState<BudgetDoc>(() => {
    const saved = loadJSON<BudgetDoc | null>("jm_orc", null);
    return saved && Array.isArray(saved.items)
      ? { ...defaultBudget(), ...saved }
      : defaultBudget();
  });
  const [rec, setRec] = useState<ReceiptDoc>(() => {
    const saved = loadJSON<ReceiptDoc | null>("jm_rec", null);
    return saved && Array.isArray(saved.items)
      ? { ...defaultReceipt(), ...saved, items: saved.items }
      : defaultReceipt();
  });
  const [priceMemo, setPriceMemo] = useState<PriceMemo>(
    () => loadJSON<PriceMemo | null>("jm_prices", null) ?? {},
  );

  const [sigRaw, setSigRaw] = useState<string | null>(() => {
    const saved = loadJSON<string | null>("jm_sig_raw", null);
    return typeof saved === "string" && saved ? saved : null;
  });
  const [sigClean, setSigClean] = useState(
    () => loadJSON<boolean>("jm_sig_clean", true) !== false,
  );
  const [sigName, setSigName] = useState(
    () => loadJSON<string>("jm_sig_name", COMPANY.signer) || COMPANY.signer,
  );
  const [signature, setSignature] = useState<LoadedImage | null>(null);
  const [sigNotice, setSigNotice] = useState<Notice>(EMPTY_NOTICE);

  const [header, setHeader] = useState<LoadedImage | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogFailed, setCatalogFailed] = useState(false);

  const [notice, setNotice] = useState<Notice>(EMPTY_NOTICE);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [images, setImages] = useState<HTMLCanvasElement[] | null>(null);

  // No celular a prévia fica em tela cheia; no desktop, na coluna lateral.
  const [desktop, setDesktop] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.matchMedia("(min-width: 1024px)").matches,
  );
  const [previewOpen, setPreviewOpen] = useState(false);

  const flashTimer = useRef<number | null>(null);
  const armTimer = useRef<number | null>(null);

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

  const showNotice = useCallback((text: string, kind: Notice["kind"] = "") => {
    setNotice({ text, kind });
  }, []);

  function focusField(id: string) {
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  }

  function flash(id: string) {
    setFlashId(id);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashId(null), 1500);
  }

  // ------------------------------------------------- cabeçalho dos documentos
  useEffect(() => {
    let alive = true;
    ensureHeaderImage().then((img) => {
      if (alive) setHeader(img);
    });
    return () => {
      alive = false;
    };
  }, []);

  // ------------------------------------------------------------- persistência
  useEffect(() => {
    saveJSON("jm_mode", mode);
  }, [mode]);

  useEffect(() => {
    saveJSON("jm_orc", orc);
  }, [orc]);

  useEffect(() => {
    saveJSON("jm_rec", rec);
  }, [rec]);

  useEffect(() => {
    saveJSON("jm_prices", priceMemo);
  }, [priceMemo]);

  useEffect(() => {
    saveJSON("jm_sig_raw", sigRaw);
  }, [sigRaw]);

  useEffect(() => {
    saveJSON("jm_sig_clean", sigClean);
  }, [sigClean]);

  useEffect(() => {
    saveJSON("jm_sig_name", sigName);
  }, [sigName]);

  // -------------------------------------------------------------- catálogo
  useEffect(() => {
    if (!authed) return;
    let alive = true;
    fetch("/catalog.json")
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<CatalogRow[]>;
      })
      .then((rows) => {
        if (!alive) return;
        if (!Array.isArray(rows)) throw new Error("formato");
        setProducts(parseCatalog(rows));
        setCatalogFailed(false);
      })
      .catch(() => {
        if (alive) setCatalogFailed(true);
      })
      .finally(() => {
        if (alive) setCatalogLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [authed]);

  // ------------------------------------------------------------ assinatura
  useEffect(() => {
    if (!sigRaw) return;
    let cancelled = false;
    processSignature(sigRaw, sigClean)
      .then((image) => {
        if (!cancelled) setSignature(image);
      })
      .catch(() => {
        if (cancelled) return;
        setSignature(null);
        setSigNotice({
          text: "Não foi possível ler a assinatura. Envie outra imagem.",
          kind: "err",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [sigRaw, sigClean]);

  // -------------------------------------------------------------- handlers
  function patchOrc(patch: Partial<BudgetDoc>) {
    setOrc((prev) => ({ ...prev, ...patch }));
  }

  function patchRec(patch: Partial<ReceiptDoc>) {
    setRec((prev) => ({ ...prev, ...patch }));
  }

  function addProduct(product: CatalogProduct) {
    const item: BudgetItem = {
      id: newId(),
      slug: product.slug,
      desc: product.name,
      qty: "1",
      unit: priceMemo[product.slug] ?? "",
    };
    setOrc((prev) => ({ ...prev, items: [...prev.items, item] }));
    flash(item.id);
    showNotice(
      item.unit.trim()
        ? "Item adicionado. Ajuste a quantidade e o valor."
        : "Item adicionado. Informe o valor unitário.",
      "ok",
    );
  }

  function addCustomItem() {
    const item: BudgetItem = { id: newId(), desc: "", qty: "1", unit: "" };
    setOrc((prev) => ({ ...prev, items: [...prev.items, item] }));
    flash(item.id);
    showNotice("Item adicionado. Descreva o produto ou serviço.", "ok");
  }

  function addLaborItem() {
    const item: BudgetItem = {
      id: newId(),
      desc: "Mão de obra / serviço",
      qty: "1",
      unit: "",
    };
    setOrc((prev) => ({ ...prev, items: [...prev.items, item] }));
    flash(item.id);
    showNotice("Mão de obra adicionada. Informe o valor.", "ok");
  }

  function updateItem(id: string, patch: Partial<BudgetItem>) {
    const target = orc.items.find((item) => item.id === id);
    if (target?.slug && patch.unit !== undefined) {
      const slug = target.slug;
      setPriceMemo((prev) => ({ ...prev, [slug]: patch.unit as string }));
    }
    setOrc((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  }

  function moveItem(id: string, direction: -1 | 1) {
    setOrc((prev) => {
      const index = prev.items.findIndex((item) => item.id === id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= prev.items.length) return prev;
      const items = [...prev.items];
      [items[index], items[next]] = [items[next], items[index]];
      return { ...prev, items };
    });
  }

  function removeItem(id: string) {
    setOrc((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  }

  function updateReceiptItem(id: string, patch: Partial<ReceiptItem>) {
    setRec((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  }

  function removeReceiptItem(id: string) {
    setRec((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  }

  function addReceiptItem() {
    const item: ReceiptItem = { id: newId(), desc: "", valor: "" };
    setRec((prev) => ({ ...prev, items: [...prev.items, item] }));
    flash(item.id);
  }

  function handleSignatureFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setSigNotice({ text: "Envie uma imagem (PNG ou JPG).", kind: "err" });
      return;
    }
    const reader = new FileReader();
    reader.onerror = () =>
      setSigNotice({ text: "Não foi possível ler o arquivo.", kind: "err" });
    reader.onload = async () => {
      try {
        const source = String(reader.result || "");
        const shrunk = await shrinkSignature(source, file.size);
        setSigRaw(shrunk);
        setSigNotice({ text: "Assinatura carregada.", kind: "ok" });
      } catch {
        setSigNotice({
          text: "Não foi possível carregar a imagem.",
          kind: "err",
        });
      }
    };
    reader.readAsDataURL(file);
  }

  function resetSignature() {
    setSigRaw(null);
    setSignature(null);
    setSigNotice({ text: "Assinatura removida.", kind: "" });
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

  function handleSignOut() {
    clearAuth();
    setAuthed(false);
    setNotice(EMPTY_NOTICE);
    setSigNotice(EMPTY_NOTICE);
  }

  if (!authed) {
    return <LoginScreen onSignIn={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen bg-neutral-100 pb-6">
      <header className="border-b-4 border-brand bg-black">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3 px-4 py-3">
          <BrandLogo />
          <div className="ml-auto flex items-center gap-1">
            <Tabs value={mode} onValueChange={handleModeChange} className="gap-0">
              <TabsList className="h-9 bg-white/10">
                <TabsTrigger
                  value="orc"
                  className="h-8 px-3 text-white/70 hover:text-white data-active:bg-white data-active:text-neutral-900"
                >
                  <FileText className="size-3.5" />
                  Fazer orçamento
                </TabsTrigger>
                <TabsTrigger
                  value="rec"
                  className="h-8 px-3 text-white/70 hover:text-white data-active:bg-white data-active:text-neutral-900"
                >
                  <Receipt className="size-3.5" />
                  Fazer recibo
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white/70 hover:bg-white/10 hover:text-white"
              onClick={handleSignOut}
            >
              <LogOut />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1280px] gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)]">
        <div className="order-2 grid gap-3 pb-16 lg:order-1 lg:pb-0">
          {mode === "orc" ? (
            <BudgetForm
              doc={orc}
              products={products}
              loading={catalogLoading}
              failed={catalogFailed}
              priceMemo={priceMemo}
              flashId={flashId}
              onPatch={patchOrc}
              onAddProduct={addProduct}
              onAddCustom={addCustomItem}
              onAddLabor={addLaborItem}
              onUpdateItem={updateItem}
              onMoveItem={moveItem}
              onRemoveItem={removeItem}
            />
          ) : (
            <ReceiptForm
              doc={rec}
              flashId={flashId}
              signature={{
                raw: sigRaw,
                clean: sigClean,
                name: sigName,
                notice: sigNotice,
                onFile: handleSignatureFile,
                onCleanChange: setSigClean,
                onNameChange: setSigName,
                onReset: resetSignature,
              }}
              onPatch={patchRec}
              onUpdateItem={updateReceiptItem}
              onRemoveItem={removeReceiptItem}
              onAddItem={addReceiptItem}
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
      </main>

      {desktop ? null : (
        <MobilePreview
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          mode={mode}
          orc={orc}
          rec={rec}
          header={header}
          signature={signature}
          signerName={sigName}
        />
      )}

      <ImagesDialog pages={images} onClose={() => setImages(null)} />
    </div>
  );
}
