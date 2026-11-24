/* eslint-disable @next/next/no-img-element */
"use client";

import { NO_IMAGE, productImageUrl } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Foto do produto vinda da loja Digital Sat, com imagem neutra de fallback. */
export function ProductThumb({
  slug,
  size = 120,
  className,
}: {
  slug: string | undefined;
  size?: number;
  className?: string;
}) {
  const src = productImageUrl(slug, size);
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = NO_IMAGE;
      }}
      className={cn("size-12 shrink-0 rounded-lg border bg-white object-contain", className)}
    />
  );
}
