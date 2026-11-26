"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type Ref,
  type SetStateAction,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  Calculator,
  Check,
  ChevronDown,
  FileText,
  PackagePlus,
  Plus,
  Search,
  Settings2,
  Shapes,
  Trash2,
  Wrench,
} from "lucide-react";
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { AutoGrowTextarea } from "@/components/auto-grow-textarea";
import { Form } from "@/components/layout/Form/form.layout";
import { InputLayout } from "@/components/layout/Form/input/input.layout";
import { MoneyInputLayout } from "@/components/layout/Form/input/money-input.layout";
import { MoneyInput } from "@/components/money-input";
import { ProductThumb } from "@/components/product-thumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientFields } from "./client-fields";
import {
  catalogCategories,
  highlightSegments,
  searchProducts,
} from "@/lib/catalog";
import { brl, fmt, newId, norm, parseMoney } from "@/lib/format";
import {
  addedProductSlugs,
  budgetItemSchema,
  canAddBudgetProduct,
} from "@/lib/schemas/budget";
import { budgetTotal } from "@/lib/totals";
import type {
  BudgetDoc,
  BudgetItem,
  CatalogProduct,
  Notice,
  PriceMemo,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL = "__all__";

function itemSubtotal(item: BudgetItem): number {
  const qty = parseMoney(item.qty);
  const unit = parseMoney(item.unit);
  return Number.isFinite(qty) && Number.isFinite(unit) ? qty * unit : 0;
}

/* eslint-disable react-hooks/refs -- refs.setReference/setFloating são callback refs do floating-ui */

interface AddProductSplitButtonProps {
  /** Foca o campo de busca do catálogo. */
  onAddProduct: () => void;
  onAddCustom: () => void;
}

/**
 * No celular o botão dividido economiza espaço: a parte principal leva à busca
 * do catálogo e a seta abre o item personalizado.
 */
function AddProductSplitButton({
  onAddProduct,
  onAddCustom,
}: AddProductSplitButtonProps) {
  const [open, setOpen] = useState(false);
  const customRef = useRef<HTMLButtonElement>(null);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "bottom-end",
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useDismiss(context, {
      outsidePress: true,
      escapeKey: true,
      referencePress: false,
    }),
  ]);

  useEffect(() => {
    if (open) customRef.current?.focus();
  }, [open]);

  function chooseCustom() {
    setOpen(false);
    onAddCustom();
  }

  return (
    <>
      <div className="flex items-stretch">
        <Button
          type="button"
          size="sm"
          className="h-9 rounded-r-none bg-neutral-900 px-2.5 text-white hover:bg-neutral-800"
          onClick={onAddProduct}
        >
          <PackagePlus />
          Adicionar produto
        </Button>
        <Button
          type="button"
          size="sm"
          ref={refs.setReference}
          {...getReferenceProps({
            onClick: () => setOpen((value) => !value),
            "aria-haspopup": "menu",
            "aria-expanded": open,
            "aria-label": "Mais opções para adicionar item",
            className:
              "h-9 rounded-l-none border-l border-white/25 bg-neutral-900 px-1.5 text-white hover:bg-neutral-800",
          })}
        >
          <ChevronDown />
        </Button>
      </div>

      {open ? (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            role="menu"
            aria-label="Mais opções para adicionar item"
            className="z-50 w-52 rounded-lg border bg-white p-1 shadow-xl"
          >
            <button
              ref={customRef}
              type="button"
              role="menuitem"
              onClick={chooseCustom}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] font-medium text-neutral-900 outline-none hover:bg-neutral-100 focus-visible:bg-neutral-100"
            >
              <Shapes className="size-4 text-brand" />
              Item personalizado
            </button>
          </div>
        </FloatingPortal>
      ) : null}
    </>
  );
}

interface ProductSearchProps {
  products: CatalogProduct[];
  loading: boolean;
  failed: boolean;
  priceMemo: PriceMemo;
  /** Slugs que já estão no orçamento. */
  addedSlugs: ReadonlySet<string>;
  onAdd: (product: CatalogProduct) => void;
  /** Permite que o botão "Adicionar produto" leve o foco ao campo de busca. */
  inputRef?: Ref<HTMLInputElement>;
}

function ProductSearch({
  products,
  loading,
  failed,
  priceMemo,
  addedSlugs,
  onAdd,
  inputRef,
}: ProductSearchProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const pointerInside = useRef(false);

  const categories = useMemo(
    () =>
      catalogCategories(products).map((name) => ({
        name,
        count: products.filter((p) => p.cat === name).length,
      })),
    [products],
  );

  const selectedCategory = category === ALL ? "" : category;
  // Catálogos grandes: aplique debounce de 150–200 ms no onChange da busca.
  const { results, total } = useMemo(
    () => searchProducts(products, query, selectedCategory, 60),
    [products, query, selectedCategory],
  );
  const show = open && Boolean(query.trim());
  const tokens = norm(query).trim().split(/\s+/).filter(Boolean);

  // Lista suspensa ancorada no campo de busca (renderizada em um portal).
  const { refs, floatingStyles, context } = useFloating({
    open: show,
    onOpenChange: setOpen,
    placement: "bottom-start",
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(6),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ rects, elements, availableHeight }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
            maxHeight: `${Math.min(availableHeight, 360)}px`,
          });
        },
      }),
    ],
  });
  const dismiss = useDismiss(context, {
    outsidePress: true,
    escapeKey: true,
    referencePress: false,
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

  function add(product: CatalogProduct) {
    // Já adicionado: mantém a busca aberta e deixa o aviso visível.
    if (addedSlugs.has(product.slug)) {
      onAdd(product);
      return;
    }
    setQuery("");
    setActive(-1);
    setOpen(false);
    onAdd(product);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!show || !results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const pick = results[active] ?? results[0];
      if (pick) add(pick);
    } else if (event.key === "Escape") {
      setQuery("");
      setActive(-1);
      setOpen(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Search className="size-4 text-brand" />
          Buscar no catálogo
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div
          ref={refs.setReference}
          {...getReferenceProps()}
          className="grid gap-2 sm:grid-cols-[1fr_210px]"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="q"
              ref={inputRef}
              className="h-10 pl-9"
              placeholder="Nome ou código do produto…"
              autoComplete="off"
              role="combobox"
              aria-expanded={show}
              aria-controls="catalog-results"
              aria-autocomplete="list"
              aria-activedescendant={
                active >= 0 ? `catalog-option-${active}` : undefined
              }
              value={query}
              onFocus={() => setOpen(true)}
              onBlur={() => {
                if (!pointerInside.current) setOpen(false);
              }}
              onChange={(event) => {
                const value = event.target.value;
                setQuery(value);
                setActive(-1);
                setOpen(Boolean(value.trim()));
              }}
              onKeyDown={handleKeyDown}
            />
          </div>
          <Select
            value={category}
            onValueChange={(value) => {
              setCategory(value ?? ALL);
              setActive(-1);
              // A lista só abre com o foco na busca, não ao escolher categoria.
              setOpen(false);
            }}
          >
            <SelectTrigger className="h-10 w-full" aria-label="Categoria">
              <SelectValue>
                {(value) =>
                  !value || value === ALL
                    ? "Todas as categorias"
                    : String(value)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as categorias</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.name} ({c.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {show ? (
          <FloatingPortal>
            <div
              id="catalog-results"
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              role="listbox"
              aria-label="Resultados da busca"
              className="z-50 overflow-y-auto overscroll-contain rounded-lg border bg-white shadow-xl"
              onPointerDownCapture={() => {
                pointerInside.current = true;
              }}
              onPointerUpCapture={() => {
                pointerInside.current = false;
              }}
            >
              {results.length === 0 ? (
                <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
                  {loading
                    ? "Carregando catálogo…"
                    : failed
                      ? "Catálogo indisponível. Use “Item personalizado”."
                      : "Nenhum produto encontrado."}
                </p>
              ) : (
                results.map((product, index) => {
                  const last = priceMemo[product.slug];
                  const lastValue = last ? parseMoney(last) : NaN;
                  const added = addedSlugs.has(product.slug);
                  return (
                    <div
                      key={product.slug + index}
                      id={`catalog-option-${index}`}
                      role="option"
                      aria-selected={index === active}
                      aria-disabled={added || undefined}
                      title={
                        added
                          ? "Este produto já está no orçamento."
                          : undefined
                      }
                      tabIndex={-1}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => add(product)}
                      onMouseEnter={() => setActive(index)}
                      className={cn(
                        "grid grid-cols-[48px_1fr_auto] items-center gap-3 border-b px-3 py-2 last:border-b-0",
                        added ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                        index === active && !added && "bg-brand/5",
                      )}
                    >
                      <ProductThumb slug={product.slug} size={96} />
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-[13.5px] leading-snug font-medium text-neutral-900",
                            added && "line-through",
                          )}
                        >
                          {highlightSegments(product.name, tokens).map(
                            (part, i) =>
                              part.hit ? (
                                <mark
                                  key={i}
                                  className="rounded bg-brand/15 px-0.5 text-brand"
                                >
                                  {part.text}
                                </mark>
                              ) : (
                                <span key={i}>{part.text}</span>
                              ),
                          )}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="secondary" className="text-[11px]">
                            {product.cat}
                          </Badge>
                          <a
                            href={`https://loja.digitalsat.com.br/produto/${product.slug}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            onClick={(event) => event.stopPropagation()}
                            className="text-[11.5px] text-muted-foreground underline-offset-2 hover:text-brand hover:underline"
                          >
                            ver na loja ↗
                          </a>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {Number.isFinite(lastValue) ? (
                          <span className="text-[11.5px] text-muted-foreground">
                            último: {brl(lastValue)}
                          </span>
                        ) : null}
                        {added ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-neutral-200 px-2 py-1 text-[11.5px] font-semibold text-neutral-600">
                            <Check className="size-3" />
                            Já adicionado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2 py-1 text-[11.5px] font-semibold text-white">
                            <Plus className="size-3" />
                            Adicionar
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </FloatingPortal>
        ) : null}

        <p className="text-xs text-muted-foreground">
          {show && results.length
            ? `Mostrando ${results.length} de ${total} produtos. Use ↑ ↓ e Enter para adicionar.`
            : loading
              ? "Carregando catálogo…"
              : failed
                ? "Não foi possível carregar o catálogo."
                : `${products.length} produtos no catálogo. Digite para buscar.`}
        </p>
      </CardContent>
    </Card>
  );
}

/* eslint-enable react-hooks/refs */

interface BudgetItemsProps {
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

function BudgetItems({
  doc,
  flashId,
  onPatch,
  onUpdateItem,
  onMoveItem,
  onRemoveItem,
  onAddProduct,
  onAddCustom,
  onAddLabor,
}: BudgetItemsProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // O painel abre abaixo da lista, então rola até ele para ficar visível.
  useEffect(() => {
    if (settingsOpen) {
      settingsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
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
            <div className="flex flex-wrap flex-row-reverse ml-auto items-center gap-1.5 sm:hidden">
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
              <Form
                key={item.id}
                schema={budgetItemSchema}
                values={item}
                onValuesChange={(patch) => onUpdateItem(item.id, patch)}
              >
                <div
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
                      <ProductThumb
                        slug={item.slug}
                        size={96}
                        className="size-11"
                      />
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
                  <div className="grid items-start gap-2 pl-6 sm:grid-cols-[92px_130px_1fr]">
                    <InputLayout<BudgetItem>
                      name="qty"
                      label="Qtd."
                      size="sm"
                      id={`qty-${item.id}`}
                      inputMode="decimal"
                    />
                    <MoneyInputLayout<BudgetItem>
                      name="unit"
                      label="Valor unit."
                      size="sm"
                      id={`unit-${item.id}`}
                    />
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
              </Form>
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

interface Props {
  doc: BudgetDoc;
  setDoc: Dispatch<SetStateAction<BudgetDoc>>;
  products: CatalogProduct[];
  loading: boolean;
  failed: boolean;
  priceMemo: PriceMemo;
  setPriceMemo: Dispatch<SetStateAction<PriceMemo>>;
  flashId: string | null;
  flash: (id: string) => void;
  onNotice: (text: string, kind?: Notice["kind"]) => void;
}

export function BudgetForm({
  doc,
  setDoc,
  products,
  loading,
  failed,
  priceMemo,
  setPriceMemo,
  flashId,
  flash,
  onNotice,
}: Props) {
  const total = budgetTotal(doc);
  const searchRef = useRef<HTMLInputElement>(null);
  const addedSlugs = useMemo(() => addedProductSlugs(doc.items), [doc.items]);

  // O botão "Adicionar produto" só leva o foco (e a rolagem) até a busca.
  function focusProductSearch() {
    const input = searchRef.current;
    if (!input) return;
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus({ preventScroll: true });
  }

  function patch(changes: Partial<BudgetDoc>) {
    setDoc((prev) => ({ ...prev, ...changes }));
  }

  function addProduct(product: CatalogProduct) {
    if (!canAddBudgetProduct(product.slug, doc.items)) {
      onNotice("Este produto já está adicionado ao orçamento.", "err");
      return;
    }
    const item: BudgetItem = {
      id: newId(),
      slug: product.slug,
      desc: product.name,
      qty: "1",
      unit: priceMemo[product.slug] ?? "",
    };
    setDoc((prev) => ({ ...prev, items: [...prev.items, item] }));
    flash(item.id);
    onNotice(
      item.unit.trim()
        ? "Item adicionado. Ajuste a quantidade e o valor."
        : "Item adicionado. Informe o valor unitário.",
      "ok",
    );
  }

  function addCustomItem() {
    const item: BudgetItem = { id: newId(), desc: "", qty: "1", unit: "" };
    setDoc((prev) => ({ ...prev, items: [...prev.items, item] }));
    flash(item.id);
    onNotice("Item adicionado. Descreva o produto ou serviço.", "ok");
  }

  function addLaborItem() {
    const item: BudgetItem = {
      id: newId(),
      desc: "Mão de obra / serviço",
      qty: "1",
      unit: "",
    };
    setDoc((prev) => ({ ...prev, items: [...prev.items, item] }));
    flash(item.id);
    onNotice("Mão de obra adicionada. Informe o valor.", "ok");
  }

  function updateItem(id: string, changes: Partial<BudgetItem>) {
    const target = doc.items.find((item) => item.id === id);
    if (target?.slug && changes.unit !== undefined) {
      const slug = target.slug;
      setPriceMemo((prev) => ({ ...prev, [slug]: changes.unit as string }));
    }
    setDoc((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    }));
  }

  function moveItem(id: string, direction: -1 | 1) {
    setDoc((prev) => {
      const index = prev.items.findIndex((item) => item.id === id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= prev.items.length) return prev;
      const items = [...prev.items];
      [items[index], items[next]] = [items[next], items[index]];
      return { ...prev, items };
    });
  }

  function removeItem(id: string) {
    setDoc((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  }

  return (
    <div className="grid gap-3">
      <ClientFields
        idPrefix="o"
        cliente={doc.cliente}
        data={doc.data}
        cnpjOn={doc.cnpjOn}
        cnpj={doc.cnpj}
        onChange={patch}
      />

      <ProductSearch
        products={products}
        loading={loading}
        failed={failed}
        priceMemo={priceMemo}
        addedSlugs={addedSlugs}
        onAdd={addProduct}
        inputRef={searchRef}
      />

      <BudgetItems
        doc={doc}
        flashId={flashId}
        onPatch={patch}
        onUpdateItem={updateItem}
        onMoveItem={moveItem}
        onRemoveItem={removeItem}
        onAddProduct={focusProductSearch}
        onAddCustom={addCustomItem}
        onAddLabor={addLaborItem}
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
                    patch({
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
                onValueChange={(totManual) => patch({ totManual })}
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
