"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = ComponentProps<typeof Textarea> & {
  value: string;
  maxHeight?: number;
};

/** Textarea que cresce conforme o conteúdo (até um limite). */
export function AutoGrowTextarea({ value, maxHeight = 160, className, ...props }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight + 2, maxHeight) + "px";
  }, [value, maxHeight]);

  return (
    <Textarea
      ref={ref}
      rows={1}
      value={value}
      className={cn("min-h-9 resize-none overflow-hidden", className)}
      {...props}
    />
  );
}
