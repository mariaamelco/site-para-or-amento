"use client";

import { useEffect, useState } from "react";
import { parseCatalog, type CatalogRow } from "@/lib/catalog";
import type { CatalogProduct } from "@/lib/types";

/** Carrega o catálogo estático uma vez por montagem. */
export function useCatalog() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/catalog.json")
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<CatalogRow[]>;
      })
      .then((rows) => {
        if (!alive) return;
        if (!Array.isArray(rows)) throw new Error("formato");
        setProducts(parseCatalog(rows));
        setFailed(false);
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { products, loading, failed };
}
