"use client";

import { Plus, Receipt, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AutoGrowTextarea } from "@/components/app/auto-grow-textarea";
import { MoneyInput } from "@/components/app/money-input";
import type { ReceiptDoc, ReceiptItem } from "@/lib/types";

interface Props {
  doc: ReceiptDoc;
  flashId: string | null;
  onUpdateItem: (id: string, patch: Partial<ReceiptItem>) => void;
  onRemoveItem: (id: string) => void;
  onAddItem: () => void;
}

export function ReceiptItems({
  doc,
  flashId,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
}: Props) {
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
