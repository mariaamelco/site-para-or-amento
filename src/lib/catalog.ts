import { norm } from "@/lib/format";
import type { CatalogProduct } from "@/lib/types";

/** Linha do catalog.json: [nome, slug, categoria]. */
export type CatalogRow = [string, string, string];

export interface SearchResult {
  product: CatalogProduct;
  score: number;
}

export function parseCatalog(rows: CatalogRow[]): CatalogProduct[] {
  return rows.map(([name, slug, cat]) => ({
    name,
    slug,
    cat,
    key: norm(name + " " + slug.replace(/-\d+$/, "").replace(/-/g, " ")),
  }));
}

export function catalogCategories(products: CatalogProduct[]): string[] {
  return [...new Set(products.map((p) => p.cat))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}

/**
 * Busca por palavras: todas precisam aparecer no nome/slug.
 * Resultados que começam com o termo vêm primeiro.
 */
export function searchProducts(
  products: CatalogProduct[],
  query: string,
  category: string,
  limit = 60,
): { results: CatalogProduct[]; total: number } {
  const q = norm(query).trim();
  if (!q && !category) return { results: [], total: 0 };
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored: SearchResult[] = [];

  for (const product of products) {
    if (category && product.cat !== category) continue;
    let ok = true;
    let score = 0;
    for (const token of tokens) {
      const i = product.key.indexOf(token);
      if (i < 0) {
        ok = false;
        break;
      }
      score += i === 0 ? 0 : product.key[i - 1] === " " ? 1 : 3;
    }
    if (ok) scored.push({ product, score: score + product.name.length / 200 });
  }

  scored.sort((a, b) => a.score - b.score);
  return {
    results: scored.slice(0, limit).map((s) => s.product),
    total: scored.length,
  };
}

export interface HighlightSegment {
  text: string;
  hit: boolean;
}

const stripMarks = (ch: string) =>
  ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Divide o nome em trechos para destacar os termos encontrados.
 * Usa um mapa de índices para acentos não deslocarem as posições.
 */
export function highlightSegments(
  name: string,
  tokens: string[],
): HighlightSegment[] {
  const chars = [...name];
  let normalized = "";
  const origin: number[] = [];
  chars.forEach((ch, i) => {
    for (const n of stripMarks(ch)) {
      normalized += n;
      origin.push(i);
    }
  });

  const hits = new Set<number>();
  for (const token of tokens) {
    if (token.length < 2) continue;
    let from = 0;
    for (;;) {
      const at = normalized.indexOf(token, from);
      if (at < 0) break;
      for (let k = at; k < at + token.length; k++) hits.add(origin[k]);
      from = at + token.length;
    }
  }

  const segments: HighlightSegment[] = [];
  chars.forEach((ch, i) => {
    const hit = hits.has(i);
    const last = segments[segments.length - 1];
    if (last && last.hit === hit) last.text += ch;
    else segments.push({ text: ch, hit });
  });
  return segments;
}
