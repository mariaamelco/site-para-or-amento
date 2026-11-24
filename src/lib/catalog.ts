import { norm } from "@/lib/format";
import { buildNameIndex, searchNameIndex, type IndexedName } from "@/lib/search";
import type { CatalogProduct } from "@/lib/types";

/** Linha do catalog.json: [nome, slug, categoria]. */
export type CatalogRow = [string, string, string];

/** O índice é montado uma vez por lista (o catálogo só troca depois do fetch). */
const indexCache = new WeakMap<
  readonly CatalogProduct[],
  IndexedName<CatalogProduct>[]
>();

function catalogIndex(products: readonly CatalogProduct[]) {
  let index = indexCache.get(products);
  if (!index) {
    index = buildNameIndex(products, (product) => product.name);
    indexCache.set(products, index);
  }
  return index;
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
 * Busca em duas camadas (exata por trecho + fuzzy). A categoria filtra a
 * lista antes da busca; sem termo, não há resultados.
 */
export function searchProducts(
  products: CatalogProduct[],
  query: string,
  category: string,
  limit = 60,
): { results: CatalogProduct[]; total: number } {
  if (!norm(query).trim()) return { results: [], total: 0 };
  const index = catalogIndex(products);
  const filtered = category
    ? index.filter((entry) => entry.item.cat === category)
    : index;
  const { entries, total } = searchNameIndex(filtered, query, limit);
  return { results: entries.map((entry) => entry.item), total };
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
