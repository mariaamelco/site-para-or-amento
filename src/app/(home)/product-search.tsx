"use client";

/* eslint-disable react-hooks/refs -- refs.setReference/setFloating são callback refs do floating-ui */

import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";
import { Plus, Search } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductThumb } from "@/components/product-thumb";
import {
  catalogCategories,
  highlightSegments,
  searchProducts,
} from "@/lib/catalog";
import { brl, norm, parseMoney } from "@/lib/format";
import type { CatalogProduct, PriceMemo } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL = "__all__";

interface Props {
  products: CatalogProduct[];
  loading: boolean;
  failed: boolean;
  priceMemo: PriceMemo;
  onAdd: (product: CatalogProduct) => void;
  /** Permite que o botão "Adicionar produto" leve o foco ao campo de busca. */
  inputRef?: Ref<HTMLInputElement>;
}

export function ProductSearch({
  products,
  loading,
  failed,
  priceMemo,
  onAdd,
  inputRef,
}: Props) {
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
                return (
                  <div
                    key={product.slug + index}
                    id={`catalog-option-${index}`}
                    role="option"
                    aria-selected={index === active}
                    tabIndex={-1}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => add(product)}
                    onMouseEnter={() => setActive(index)}
                    className={cn(
                      "grid cursor-pointer grid-cols-[48px_1fr_auto] items-center gap-3 border-b px-3 py-2 last:border-b-0",
                      index === active && "bg-brand/5",
                    )}
                  >
                    <ProductThumb slug={product.slug} size={96} />
                    <div className="min-w-0">
                      <p className="text-[13.5px] leading-snug font-medium text-neutral-900">
                        {highlightSegments(product.name, tokens).map((part, i) =>
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
                      <span className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2 py-1 text-[11.5px] font-semibold text-white">
                        <Plus className="size-3" />
                        Adicionar
                      </span>
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
