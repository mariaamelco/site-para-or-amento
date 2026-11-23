"use client";

import { useRef } from "react";
import { Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { BudgetItems } from "./budget-items";
import { ClientFields } from "./client-fields";
import { MoneyInput } from "@/components/money-input";
import { ProductSearch } from "./product-search";
import { brl, fmt } from "@/lib/format";
import { budgetTotal } from "@/lib/totals";
import type {
  BudgetDoc,
  BudgetItem,
  CatalogProduct,
  PriceMemo,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  doc: BudgetDoc;
  products: CatalogProduct[];
  loading: boolean;
  failed: boolean;
  priceMemo: PriceMemo;
  flashId: string | null;
  onPatch: (patch: Partial<BudgetDoc>) => void;
  onAddProduct: (product: CatalogProduct) => void;
  onAddCustom: () => void;
  onAddLabor: () => void;
  onUpdateItem: (id: string, patch: Partial<BudgetItem>) => void;
  onMoveItem: (id: string, direction: -1 | 1) => void;
  onRemoveItem: (id: string) => void;
}

export function BudgetForm(props: Props) {
  const { doc, onPatch } = props;
  const total = budgetTotal(doc);
  const searchRef = useRef<HTMLInputElement>(null);

  // O botão "Adicionar produto" só leva o foco (e a rolagem) até a busca.
  function focusProductSearch() {
    const input = searchRef.current;
    if (!input) return;
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus({ preventScroll: true });
  }

  return (
    <div className="grid gap-3">
      <ClientFields
        idPrefix="o"
        cliente={doc.cliente}
        data={doc.data}
        cnpjOn={doc.cnpjOn}
        cnpj={doc.cnpj}
        onChange={onPatch}
      />

      <ProductSearch
        products={props.products}
        loading={props.loading}
        failed={props.failed}
        priceMemo={props.priceMemo}
        onAdd={props.onAddProduct}
        inputRef={searchRef}
      />

      <BudgetItems
        doc={doc}
        flashId={props.flashId}
        onPatch={onPatch}
        onUpdateItem={props.onUpdateItem}
        onMoveItem={props.onMoveItem}
        onRemoveItem={props.onRemoveItem}
        onAddProduct={focusProductSearch}
        onAddCustom={props.onAddCustom}
        onAddLabor={props.onAddLabor}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <Calculator className="size-4 text-brand" />
            Total
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-1.5">
            <Label className="text-[12.5px] text-muted-foreground">
              Como calcular
            </Label>
            <div
              role="group"
              aria-label="Como calcular o total"
              className="grid grid-cols-2 gap-1 rounded-lg bg-neutral-100 p-1"
            >
              {(
                [
                  ["auto", "Somar os itens"],
                  ["man", "Valor manual"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={doc.totMode === value}
                  onClick={() =>
                    onPatch({
                      totMode: value,
                      totManual:
                        value === "man" && !doc.totManual && total > 0
                          ? fmt(total)
                          : doc.totManual,
                    })
                  }
                  className={cn(
                    "rounded-md px-2 py-1.5 text-[12.5px] font-semibold transition-colors",
                    doc.totMode === value
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-muted-foreground hover:text-neutral-900",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {doc.totMode === "man" ? (
            <div className="grid gap-1.5">
              <Label
                htmlFor="o-totman"
                className="text-[12.5px] text-muted-foreground"
              >
                Total que aparece no documento
              </Label>
              <MoneyInput
                id="o-totman"
                value={doc.totManual}
                onValueChange={(totManual) => onPatch({ totManual })}
              />
            </div>
          ) : null}

          <div className="flex items-center justify-between rounded-lg bg-neutral-900 px-3.5 py-2.5 text-white">
            <span className="text-[12.5px] font-semibold tracking-wide uppercase">
              Total
            </span>
            <span className="text-[18px] font-bold">{brl(total)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
