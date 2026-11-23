"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  FileText,
  PackagePlus,
  Settings2,
  Shapes,
  Trash2,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutoGrowTextarea } from "@/components/auto-grow-textarea";
import { AddProductSplitButton } from "./add-product-split-button";
import { MoneyInput } from "@/components/money-input";
import { ProductThumb } from "@/components/product-thumb";
import { brl, parseMoney } from "@/lib/format";
import type { BudgetDoc, BudgetItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function itemSubtotal(item: BudgetItem): number {
  const qty = parseMoney(item.qty);
  const unit = parseMoney(item.unit);
  return Number.isFinite(qty) && Number.isFinite(unit) ? qty * unit : 0;
}

interface Props {
  doc: BudgetDoc;
  flashId: string | null;
  onPatch: (patch: Partial<BudgetDoc>) => void;
  onUpdateItem: (id: string, patch: Partial<BudgetItem>) => void;
  onMoveItem: (id: string, direction: -1 | 1) => void;
  onRemoveItem: (id: string) => void;
  onAddProduct: () => void;
  onAddCustom: () => void;
  onAddLabor: () => void;
}

export function BudgetItems({
  doc,
  flashId,
  onPatch,
  onUpdateItem,
  onMoveItem,
  onRemoveItem,
  onAddProduct,
  onAddCustom,
  onAddLabor,
}: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // O painel abre abaixo da lista, então rola até ele para ficar visível.
  useEffect(() => {
    if (settingsOpen) {
      settingsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [settingsOpen]);

  return (
    <Card className="overflow-visible">
      <CardHeader className="sticky top-0 z-20 items-center border-b bg-card pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <FileText className="size-4 text-brand" />
            Itens do orçamento
            <Badge variant="secondary">{doc.items.length}</Badge>
          </CardTitle>
          <div className="flex w-full flex-wrap items-center gap-1.5 sm:ml-auto sm:w-auto">
            {/* Celular: botão dividido (produto + item personalizado) e mão de obra. */}
            <div className="flex flex-wrap items-center gap-1.5 sm:hidden">
              <AddProductSplitButton
                onAddProduct={onAddProduct}
                onAddCustom={onAddCustom}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 text-[12.5px]"
                aria-label="Mão de obra / serviço"
                onClick={onAddLabor}
              >
                <Wrench />
                Mão de obra
              </Button>
            </div>

            {/* Desktop: os três botões separados. */}
            <div className="hidden gap-1.5 sm:flex">
              <Button
                type="button"
                size="xs"
                className="bg-neutral-900 text-white hover:bg-neutral-800"
                onClick={onAddProduct}
              >
                <PackagePlus />
                Adicionar produto
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={onAddCustom}
              >
                <Shapes />
                Item personalizado
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={onAddLabor}
              >
                <Wrench />
                Mão de obra / serviço
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {doc.items.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-8 text-center text-[13px] text-muted-foreground">
            Nenhum item ainda. Busque no catálogo ou adicione um item
            personalizado.
          </p>
        ) : (
          <div className="grid max-h-[min(58vh,520px)] gap-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
            {doc.items.map((item, index) => (
              <div
                key={item.id}
                data-item-id={item.id}
                className={cn(
                  "grid gap-2 rounded-lg border bg-card p-2.5",
                  flashId === item.id && "item-flash",
                )}
              >
                <div
                  className={cn(
                    "grid items-start gap-2",
                    item.slug
                      ? "grid-cols-[16px_44px_1fr_auto]"
                      : "grid-cols-[16px_1fr_auto]",
                  )}
                >
                  <span className="pt-2.5 text-center text-xs font-bold text-muted-foreground">
                    {index + 1}
                  </span>
                  {item.slug ? (
                    <ProductThumb slug={item.slug} size={96} className="size-11" />
                  ) : null}
                  <AutoGrowTextarea
                    aria-label={`Descrição do item ${index + 1}`}
                    className="min-h-10 text-[13.5px]"
                    value={item.desc}
                    onChange={(event) =>
                      onUpdateItem(item.id, { desc: event.target.value })
                    }
                  />
                  <div className="flex gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Mover para cima"
                      disabled={index === 0}
                      onClick={() => onMoveItem(item.id, -1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Mover para baixo"
                      disabled={index === doc.items.length - 1}
                      onClick={() => onMoveItem(item.id, 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remover item"
                      className="text-brand hover:bg-brand/10 hover:text-brand"
                      onClick={() => onRemoveItem(item.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <div className="grid items-end gap-2 pl-6 sm:grid-cols-[92px_130px_1fr]">
                  <div className="grid gap-1">
                    <Label
                      htmlFor={`qty-${item.id}`}
                      className="text-[11.5px] text-muted-foreground"
                    >
                      Qtd.
                    </Label>
                    <Input
                      id={`qty-${item.id}`}
                      className="h-9"
                      inputMode="decimal"
                      value={item.qty}
                      onChange={(event) =>
                        onUpdateItem(item.id, { qty: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label
                      htmlFor={`unit-${item.id}`}
                      className="text-[11.5px] text-muted-foreground"
                    >
                      Valor unit.
                    </Label>
                    <MoneyInput
                      id={`unit-${item.id}`}
                      className="[&_input]:h-9"
                      value={item.unit}
                      onValueChange={(unit) => onUpdateItem(item.id, { unit })}
                    />
                  </div>
                  <div className="text-right">
                    <span className="block text-[11.5px] text-muted-foreground">
                      Subtotal
                    </span>
                    <span className="text-[14px] font-semibold">
                      {brl(itemSubtotal(item))}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Faixa de configurações: mesma largura da seção, sem cara de botão. */}
        <div className="-mx-(--card-spacing)">
          <button
            type="button"
            aria-expanded={settingsOpen}
            aria-controls="budget-settings"
            onClick={() => setSettingsOpen((value) => !value)}
            className="flex w-full items-center gap-2 border-t px-(--card-spacing) py-2.5 text-left text-[12px] font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <Settings2 className="size-3.5 shrink-0" />
            Configurações
            <ChevronDown
              aria-hidden
              className={cn(
                "ml-auto size-4 shrink-0 transition-transform",
                settingsOpen && "rotate-180",
              )}
            />
          </button>

          {settingsOpen ? (
            <div
              id="budget-settings"
              ref={settingsRef}
              className="grid gap-3 border-t bg-muted/40 px-(--card-spacing) py-3"
            >
              <div className="grid gap-1.5">
                <Label
                  htmlFor="o-coltitle"
                  className="text-[12.5px] text-muted-foreground"
                >
                  Título da coluna de descrição
                </Label>
                <Input
                  id="o-coltitle"
                  className="h-9 bg-white sm:max-w-[300px]"
                  maxLength={24}
                  value={doc.colTitle}
                  onChange={(event) =>
                    onPatch({ colTitle: event.target.value })
                  }
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Label htmlFor="o-unit" className="text-[13px] font-normal">
                  <Checkbox
                    id="o-unit"
                    checked={doc.unitCol}
                    onCheckedChange={(checked) =>
                      onPatch({ unitCol: checked === true })
                    }
                  />
                  Mostrar coluna “UNIT.”
                </Label>
                <Label htmlFor="o-photos" className="text-[13px] font-normal">
                  <Checkbox
                    id="o-photos"
                    checked={doc.photos}
                    onCheckedChange={(checked) =>
                      onPatch({ photos: checked === true })
                    }
                  />
                  Incluir fotos dos produtos
                </Label>
              </div>
              <div className="grid gap-1.5 border-t pt-3">
                <Label
                  htmlFor="o-obs"
                  className="text-[12.5px] text-muted-foreground"
                >
                  Observações
                </Label>
                <AutoGrowTextarea
                  id="o-obs"
                  className="min-h-16 bg-white text-[13.5px]"
                  maxHeight={220}
                  placeholder="Garantia, prazo de entrega, condições de pagamento…"
                  value={doc.obs}
                  onChange={(event) => onPatch({ obs: event.target.value })}
                />
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
