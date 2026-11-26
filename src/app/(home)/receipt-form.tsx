"use client";

import {
  useRef,
  useState,
  type Dispatch,
  type DragEvent,
  type SetStateAction,
} from "react";
import {
  Calculator,
  ImageUp,
  PenLine,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import { AutoGrowTextarea } from "@/components/auto-grow-textarea";
import { MoneyInput } from "@/components/money-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClientFields } from "./client-fields";
import { shrinkSignature } from "@/lib/document/signature";
import { brl, newId } from "@/lib/format";
import { receiptTotal } from "@/lib/totals";
import type { Notice, ReceiptDoc, ReceiptItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ReceiptItemsProps {
  doc: ReceiptDoc;
  flashId: string | null;
  onUpdateItem: (id: string, patch: Partial<ReceiptItem>) => void;
  onRemoveItem: (id: string) => void;
  onAddItem: () => void;
}

function ReceiptItems({
  doc,
  flashId,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
}: ReceiptItemsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Receipt className="size-4 text-brand" />
          Itens do recibo
          <Badge variant="secondary">{doc.items.length}</Badge>
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="ml-auto"
            onClick={onAddItem}
          >
            <Plus />
            Item
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {doc.items.map((item, index) => (
          <div
            key={item.id}
            data-item-id={item.id}
            className={
              "grid grid-cols-[16px_1fr] items-start gap-2 rounded-lg border bg-card p-2.5 " +
              (flashId === item.id ? "item-flash" : "")
            }
          >
            <span className="pt-6 text-xs font-bold text-muted-foreground">
              {index + 1}
            </span>
            <div className="grid items-start gap-2 sm:grid-cols-[1fr_150px_auto]">
              <div className="grid gap-1">
                <Label
                  htmlFor={`rdesc-${item.id}`}
                  className="text-[11.5px] text-muted-foreground"
                >
                  Descrição
                </Label>
                <AutoGrowTextarea
                  id={`rdesc-${item.id}`}
                  className="min-h-10 text-[13.5px]"
                  value={item.desc}
                  onChange={(event) =>
                    onUpdateItem(item.id, { desc: event.target.value })
                  }
                />
              </div>
              <div className="grid gap-1">
                <Label
                  htmlFor={`rval-${item.id}`}
                  className="text-[11.5px] text-muted-foreground"
                >
                  Valor
                </Label>
                <MoneyInput
                  id={`rval-${item.id}`}
                  className="[&_input]:h-10"
                  value={item.valor}
                  onValueChange={(valor) => onUpdateItem(item.id, { valor })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remover item"
                className="mt-5 text-brand hover:bg-brand/10 hover:text-brand"
                onClick={() => onRemoveItem(item.id)}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={onAddItem}>
          <Plus />
          Adicionar item
        </Button>
      </CardContent>
    </Card>
  );
}

interface SignaturePanelProps {
  raw: string | null;
  clean: boolean;
  name: string;
  notice: Notice;
  onFile: (file: File) => void;
  onCleanChange: (clean: boolean) => void;
  onNameChange: (name: string) => void;
  onReset: () => void;
}

function SignaturePanel({
  raw,
  clean,
  name,
  notice,
  onFile,
  onCleanChange,
  onNameChange,
  onReset,
}: SignaturePanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <PenLine className="size-4 text-brand" />
          Assinatura
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex min-h-[112px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-4 text-center transition-colors",
            dragging
              ? "border-brand bg-brand/5"
              : "hover:border-brand/60 hover:bg-neutral-50",
          )}
        >
          {raw ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={raw}
                alt="Assinatura"
                className="max-h-[110px] max-w-full object-contain"
              />
              <span className="text-[11.5px] text-muted-foreground">
                Clique ou arraste para trocar
              </span>
            </>
          ) : (
            <>
              <ImageUp className="size-5 text-muted-foreground" />
              <span className="text-[13px] font-medium">
                Clique ou arraste a foto da assinatura
              </span>
              <span className="text-[11.5px] text-muted-foreground">
                PNG ou JPG, fundo claro
              </span>
            </>
          )}
        </button>

        <Label htmlFor="sig-clean" className="text-[13px] font-normal">
          <Checkbox
            id="sig-clean"
            checked={clean}
            onCheckedChange={(checked) => onCleanChange(checked === true)}
          />
          Remover o fundo branco do papel
        </Label>

        <div className="grid gap-1.5">
          <Label htmlFor="sig-name" className="text-[12.5px] text-muted-foreground">
            Nome de quem assina
          </Label>
          <Input
            id="sig-name"
            className="h-9"
            maxLength={40}
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
          />
        </div>

        {raw ? (
          <Button type="button" variant="outline" size="sm" onClick={onReset}>
            <Trash2 />
            Remover assinatura
          </Button>
        ) : null}

        <p
          role="status"
          className={cn(
            "min-h-[18px] text-[12.5px]",
            notice.kind === "err"
              ? "text-brand"
              : notice.kind === "ok"
                ? "text-emerald-600"
                : "text-muted-foreground",
          )}
        >
          {notice.text}
        </p>
      </CardContent>
    </Card>
  );
}

interface Props {
  doc: ReceiptDoc;
  setDoc: Dispatch<SetStateAction<ReceiptDoc>>;
  flashId: string | null;
  flash: (id: string) => void;
  signature: {
    raw: string | null;
    setRaw: Dispatch<SetStateAction<string | null>>;
    clean: boolean;
    setClean: Dispatch<SetStateAction<boolean>>;
    name: string;
    setName: Dispatch<SetStateAction<string>>;
    notice: Notice;
    setNotice: Dispatch<SetStateAction<Notice>>;
  };
}

export function ReceiptForm({
  doc,
  setDoc,
  flashId,
  flash,
  signature,
}: Props) {
  function patch(changes: Partial<ReceiptDoc>) {
    setDoc((prev) => ({ ...prev, ...changes }));
  }

  function updateItem(id: string, changes: Partial<ReceiptItem>) {
    setDoc((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    }));
  }

  function removeItem(id: string) {
    setDoc((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  }

  function addItem() {
    const item: ReceiptItem = { id: newId(), desc: "", valor: "" };
    setDoc((prev) => ({ ...prev, items: [...prev.items, item] }));
    flash(item.id);
  }

  function handleSignatureFile(file: File) {
    if (!file.type.startsWith("image/")) {
      signature.setNotice({
        text: "Envie uma imagem (PNG ou JPG).",
        kind: "err",
      });
      return;
    }
    const reader = new FileReader();
    reader.onerror = () =>
      signature.setNotice({
        text: "Não foi possível ler o arquivo.",
        kind: "err",
      });
    reader.onload = async () => {
      try {
        const source = String(reader.result || "");
        const shrunk = await shrinkSignature(source, file.size);
        signature.setRaw(shrunk);
        signature.setNotice({ text: "Assinatura carregada.", kind: "ok" });
      } catch {
        signature.setNotice({
          text: "Não foi possível carregar a imagem.",
          kind: "err",
        });
      }
    };
    reader.readAsDataURL(file);
  }

  function resetSignature() {
    signature.setRaw(null);
    signature.setNotice({ text: "Assinatura removida.", kind: "" });
  }

  return (
    <div className="grid gap-3">
      <ClientFields
        idPrefix="r"
        cliente={doc.cliente}
        data={doc.data}
        cnpjOn={doc.cnpjOn}
        cnpj={doc.cnpj}
        onChange={patch}
      />

      <ReceiptItems
        doc={doc}
        flashId={flashId}
        onUpdateItem={updateItem}
        onRemoveItem={removeItem}
        onAddItem={addItem}
      />

      <SignaturePanel
        raw={signature.raw}
        clean={signature.clean}
        name={signature.name}
        notice={signature.notice}
        onFile={handleSignatureFile}
        onCleanChange={signature.setClean}
        onNameChange={signature.setName}
        onReset={resetSignature}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <Calculator className="size-4 text-brand" />
            Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg bg-neutral-900 px-3.5 py-2.5 text-white">
            <span className="text-[12.5px] font-semibold tracking-wide uppercase">
              Total recebido
            </span>
            <span className="text-[18px] font-bold">{brl(receiptTotal(doc))}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
