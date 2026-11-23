"use client";

/* eslint-disable react-hooks/refs -- refs.setReference/setFloating são callback refs do floating-ui */

import { useEffect, useRef, useState } from "react";
import { ChevronDown, PackagePlus, Shapes } from "lucide-react";
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { Button } from "@/components/ui/button";

interface Props {
  /** Foca o campo de busca do catálogo. */
  onAddProduct: () => void;
  onAddCustom: () => void;
}

/**
 * No celular o botão dividido economiza espaço: a parte principal leva à busca
 * do catálogo e a seta abre o item personalizado.
 */
export function AddProductSplitButton({ onAddProduct, onAddCustom }: Props) {
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
