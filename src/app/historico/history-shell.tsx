"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Copy,
  Download,
  FileText,
  FolderOpen,
  MoreVertical,
  Receipt,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deliverFiles, documentName, toFile } from "@/lib/document/download";
import { ShareFilesDialog } from "@/components/share-files-dialog";
import { loadSignature, renderExportPages } from "@/lib/document/export";
import { buildPDF } from "@/lib/document/pdf";
import { defaultBudget, defaultReceipt } from "@/lib/documents";
import { brDate, brl } from "@/lib/format";
import { quoteText } from "@/lib/history";
import { restoreHistoryEntry } from "@/lib/history-store";
import { useHistoryEntries } from "@/lib/hooks/history";
import type { HistoryEntry, Mode, Notice } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMPTY_NOTICE: Notice = { text: "", kind: "" };

/** Altura de partida do card; o valor real é medido depois da montagem. */
const CARD_HEIGHT = 92;
const CARD_GAP = 12;

/** Colunas conforme a largura da lista (antes: 2 em `sm`, 3 em `xl`). */
function columnsFor(width: number): number {
  if (width >= 1200) return 3;
  if (width >= 600) return 2;
  return 1;
}

/** Redesenha o documento salvo na escala de exportação (~200 dpi). */
async function renderEntryPages(
  entry: HistoryEntry,
): Promise<HTMLCanvasElement[]> {
  const signature = await loadSignature(entry.signature);
  return renderExportPages({
    mode: entry.mode,
    orc: entry.mode === "orc" ? entry.doc : defaultBudget(),
    rec: entry.mode === "rec" ? entry.doc : defaultReceipt(),
    signature,
    signerName: entry.signature.name,
  });
}

interface HistoryCardProps {
  entry: HistoryEntry;
  busy: boolean;
  onOpen: () => void;
  onDownload: () => void;
  onQuote: () => void;
}

function HistoryCard({
  entry,
  busy,
  onOpen,
  onDownload,
  onQuote,
}: HistoryCardProps) {
  const kind = entry.mode === "orc" ? "orçamento" : "recibo";

  return (
    <Card size="sm" data-history-id={entry.id}>
      <CardContent className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
          {entry.mode === "orc" ? (
            <FileText className="size-4" />
          ) : (
            <Receipt className="size-4" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-900">
            {entry.cliente || "Sem cliente"}
          </p>
          <p className="text-[12.5px] text-muted-foreground">
            {brDate(entry.data)} ·{" "}
            {entry.mode === "orc" ? "Orçamento" : "Recibo"}
          </p>
          <p className="mt-1 text-sm font-semibold text-brand">
            {brl(entry.total)}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "shrink-0 text-neutral-500",
            )}
            aria-label={`Ações do ${kind} de ${entry.cliente || "sem cliente"}`}
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem disabled={busy} onClick={onOpen}>
              <FolderOpen />
              Abrir
            </DropdownMenuItem>
            <DropdownMenuItem disabled={busy} onClick={onDownload}>
              <Download />
              Baixar
            </DropdownMenuItem>
            {entry.mode === "orc" ? (
              <DropdownMenuItem disabled={busy} onClick={onQuote}>
                <Copy />
                Pedir orçamento
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}

interface HistoryListProps {
  entries: HistoryEntry[];
  filter: Mode;
  busy: boolean;
  onOpen: (entry: HistoryEntry) => void;
  onDownload: (entry: HistoryEntry) => void;
  onQuote: (entry: HistoryEntry) => void;
}

/** Grade virtualizada: só os cards visíveis (mais a folga) são montados. */
function HistoryList({
  entries,
  filter,
  busy,
  onOpen,
  onDownload,
  onQuote,
}: HistoryListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    // a própria lista decide as colunas: ela é limitada a max-w-[1280px]
    const update = () => setColumns(columnsFor(element.clientWidth));
    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CARD_HEIGHT,
    getItemKey: (index) => {
      const entry = entries[index];
      return entry ? `${entry.mode}-${entry.id}` : index;
    },
    lanes: columns,
    gap: CARD_GAP,
    overscan: 3,
  });

  // trocar de aba recomeça a leitura do topo
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [filter]);

  return (
    <div
      ref={scrollRef}
      data-history-list=""
      className="max-h-[calc(100dvh-12rem)] overflow-y-auto overscroll-contain"
    >
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const entry = entries[item.index];
          if (!entry) return null;

          return (
            <div
              key={item.key}
              ref={virtualizer.measureElement}
              data-index={item.index}
              className="absolute top-0"
              style={{
                left: `${(item.lane * 100) / columns}%`,
                width: `${100 / columns}%`,
                paddingLeft: item.lane === 0 ? 0 : CARD_GAP / 2,
                paddingRight: item.lane === columns - 1 ? 0 : CARD_GAP / 2,
                transform: `translateY(${item.start}px)`,
              }}
            >
              <HistoryCard
                entry={entry}
                busy={busy}
                onOpen={() => onOpen(entry)}
                onDownload={() => onDownload(entry)}
                onQuote={() => onQuote(entry)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HistoryShell() {
  const router = useRouter();
  const { entries, loading, failed } = useHistoryEntries();
  const [filter, setFilter] = useState<Mode>("orc");
  const [notice, setNotice] = useState<Notice>(EMPTY_NOTICE);
  /** PDF esperando um toque para abrir o compartilhamento do celular. */
  const [pendingShare, setPendingShare] = useState<File[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const all = entries ?? [];
  const visible = all.filter((entry) => entry.mode === filter);
  const countOf = (mode: Mode) =>
    all.filter((entry) => entry.mode === mode).length;

  function handleModeChange(value: string) {
    setFilter(value === "rec" ? "rec" : "orc");
    setNotice(EMPTY_NOTICE);
  }

  /** Devolve o documento ao `localStorage` e abre a tela inicial. */
  function handleOpen(entry: HistoryEntry) {
    restoreHistoryEntry(entry);
    router.push("/");
  }

  async function handleDownload(entry: HistoryEntry) {
    if (busyId) return;
    setBusyId(entry.id);
    setNotice({ text: "Gerando PDF…", kind: "" });
    try {
      const pages = await renderEntryPages(entry);
      const blob = await buildPDF(pages);
      const name = documentName(entry.mode, entry.doc, "pdf", 1, pages.length);
      const files = [toFile(blob, name)];
      const result = await deliverFiles(files);
      if (result === "needs-tap") {
        setNotice({ text: `Pronto: ${name}. Toque em “Enviar arquivo”.`, kind: "" });
        setPendingShare(files);
      } else {
        setNotice(
          result === "cancelled"
            ? { text: "Envio cancelado.", kind: "" }
            : { text: `${result === "shared" ? "Enviado" : "Arquivo baixado"}: ${name}`, kind: "ok" },
        );
      }
    } catch {
      setNotice({
        text: "Não foi possível gerar o PDF. Tente novamente.",
        kind: "err",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleQuote(entry: HistoryEntry) {
    if (entry.mode !== "orc") return;
    const text = quoteText(entry.doc);
    if (!text) {
      setNotice({
        text: "Este orçamento não tem itens para enviar.",
        kind: "err",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setNotice({
        text: "Lista copiada. Agora é só colar no WhatsApp.",
        kind: "ok",
      });
    } catch {
      setNotice({
        text: "Não foi possível copiar. Verifique a permissão do navegador.",
        kind: "err",
      });
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 py-4">
      <div className="mb-3 flex flex-col sm:flex-row flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-neutral-900">Histórico</h1>
          <p className="text-[13px] text-muted-foreground">
            Orçamentos e recibos salvos neste navegador nos últimos 30 dias.
          </p>
        </div>

        <Tabs value={filter} onValueChange={handleModeChange} className="gap-0">
          <TabsList className="h-10 rounded-lg bg-white p-1 shadow-sm ring-1 ring-black/5 sm:w-auto">
            <TabsTrigger
              value="orc"
              className="h-8 gap-2 px-4 text-neutral-500 data-active:bg-neutral-900 data-active:text-white"
            >
              <FileText className="size-3.5" />
              Orçamentos
              {countOf("orc") ? ` (${countOf("orc")})` : ""}
            </TabsTrigger>
            <TabsTrigger
              value="rec"
              className="h-8 gap-2 px-4 text-neutral-500 data-active:bg-neutral-900 data-active:text-white"
            >
              <Receipt className="size-3.5" />
              Recibos
              {countOf("rec") ? ` (${countOf("rec")})` : ""}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <p
        role="status"
        aria-live="polite"
        className={cn(
          "mb-3 min-h-[18px] text-[12.5px]",
          notice.kind === "err"
            ? "text-brand"
            : notice.kind === "ok"
              ? "text-emerald-600"
              : "text-muted-foreground",
        )}
      >
        {notice.text}
      </p>

      {loading ? (
        <p className="py-10 text-center text-sm text-neutral-500">
          Carregando histórico…
        </p>
      ) : failed ? (
        <p className="py-10 text-center text-sm text-neutral-500">
          Não foi possível abrir o histórico neste navegador.
        </p>
      ) : visible.length ? (
        <HistoryList
          entries={visible}
          filter={filter}
          busy={busyId !== null}
          onOpen={handleOpen}
          onDownload={(entry) => void handleDownload(entry)}
          onQuote={(entry) => void handleQuote(entry)}
        />
      ) : (
        <Card>
          <CardContent className="grid gap-1 py-6 text-center">
            <p className="text-sm font-medium text-neutral-900">
              {filter === "orc"
                ? "Nenhum orçamento salvo ainda."
                : "Nenhum recibo salvo ainda."}
            </p>
            <p className="text-[13px] text-muted-foreground">
              O documento entra aqui ao baixar o PDF, baixar a imagem ou copiar
              a imagem.
            </p>
          </CardContent>
        </Card>
      )}
      <ShareFilesDialog
        files={pendingShare}
        onDone={(result) => {
          const name = pendingShare?.[0]?.name ?? "";
          setPendingShare(null);
          setNotice(
            result === "shared"
              ? { text: `Enviado: ${name}`, kind: "ok" }
              : { text: "Envio cancelado.", kind: "" },
          );
        }}
      />
    </main>
  );
}
