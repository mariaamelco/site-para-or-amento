"use client";

import { Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientFields } from "./client-fields";
import { ReceiptItems } from "./receipt-items";
import { SignaturePanel } from "./signature-panel";
import { brl } from "@/lib/format";
import { receiptTotal } from "@/lib/totals";
import type { Notice, ReceiptDoc, ReceiptItem } from "@/lib/types";

interface Props {
  doc: ReceiptDoc;
  flashId: string | null;
  signature: {
    raw: string | null;
    clean: boolean;
    name: string;
    notice: Notice;
    onFile: (file: File) => void;
    onCleanChange: (clean: boolean) => void;
    onNameChange: (name: string) => void;
    onReset: () => void;
  };
  onPatch: (patch: Partial<ReceiptDoc>) => void;
  onUpdateItem: (id: string, patch: Partial<ReceiptItem>) => void;
  onRemoveItem: (id: string) => void;
  onAddItem: () => void;
}

export function ReceiptForm({
  doc,
  flashId,
  signature,
  onPatch,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
}: Props) {
  return (
    <div className="grid gap-3">
      <ClientFields
        idPrefix="r"
        cliente={doc.cliente}
        data={doc.data}
        cnpjOn={doc.cnpjOn}
        cnpj={doc.cnpj}
        onChange={onPatch}
      />

      <ReceiptItems
        doc={doc}
        flashId={flashId}
        onUpdateItem={onUpdateItem}
        onRemoveItem={onRemoveItem}
        onAddItem={onAddItem}
      />

      <SignaturePanel {...signature} />

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
