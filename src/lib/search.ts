import { norm } from "@/lib/format";

/**
 * Busca de nomes em duas camadas.
 *
 * 1. Exata por trecho: todos os tokens precisam aparecer no nome (em qualquer
 *    ordem). A pontuação por token é 3 (nome começa com ele), 2 (alguma
 *    palavra começa com ele) ou 1 (só contém).
 * 2. Fuzzy (Sellers/Levenshtein por trecho): só roda quando a camada exata
 *    devolve menos de 5 resultados. A tolerância depende do tamanho do token.
 */

export interface IndexedName<T> {
  item: T;
  /** Nome original, usado na interface. */
  nome: string;
  /** Nome normalizado: sem acentos e minúsculo. */
  n: string;
  /** Palavras normalizadas, usadas na pontuação de prefixo. */
  palavras: string[];
}

export interface SearchOutcome<T> {
  entries: IndexedName<T>[];
  /** Total de encontrados antes de aplicar o limite. */
  total: number;
}

/** Pré-processamento: monte o índice uma vez por lista. */
export function buildNameIndex<T>(
  items: readonly T[],
  getName: (item: T) => string,
): IndexedName<T>[] {
  return items.map((item) => {
    const nome = getName(item);
    const n = norm(nome);
    return { item, nome, n, palavras: n.split(/\s+/).filter(Boolean) };
  });
}

/** Tolera 0 erros até 3 letras, 1 erro de 4 a 6 e 2 erros a partir de 7. */
export function toleranceFor(token: string): number {
  if (token.length >= 7) return 2;
  if (token.length >= 4) return 1;
  return 0;
}

/**
 * Distância de Sellers: menor número de edições para o token aparecer em
 * qualquer trecho do texto. A primeira linha começa zerada, o que permite
 * "pular" o prefixo do texto (busca por trecho, não pelo nome inteiro).
 */
export function sellersDistance(token: string, text: string): number {
  if (!token.length) return 0;
  if (!text.length) return token.length;

  let previous = new Array<number>(text.length + 1).fill(0);
  let current = new Array<number>(text.length + 1);

  for (let i = 1; i <= token.length; i++) {
    current[0] = i;
    for (let j = 1; j <= text.length; j++) {
      const cost = token.charCodeAt(i - 1) === text.charCodeAt(j - 1) ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1, // remove do token
        current[j - 1] + 1, // insere no token
        previous[j - 1] + cost, // substitui
      );
    }
    [previous, current] = [current, previous];
  }

  let best = previous[0];
  for (let j = 1; j < previous.length; j++) {
    if (previous[j] < best) best = previous[j];
  }
  return best;
}

/** Pontuação da camada exata; null quando algum token não aparece. */
function exactScore(entry: IndexedName<unknown>, tokens: string[]) {
  let score = 0;
  for (const token of tokens) {
    if (!entry.n.includes(token)) return null;
    if (entry.n.startsWith(token)) score += 3;
    else if (entry.palavras.some((word) => word.startsWith(token))) score += 2;
    else score += 1;
  }
  return score;
}

/** Soma dos erros da camada fuzzy; null se algum token passa da tolerância. */
function fuzzyErrors(entry: IndexedName<unknown>, tokens: string[]) {
  let total = 0;
  for (const token of tokens) {
    const distance = sellersDistance(token, entry.n);
    if (distance > toleranceFor(token)) return null;
    total += distance;
  }
  return total;
}

export function searchNameIndex<T>(
  index: readonly IndexedName<T>[],
  term: string,
  limit = 60,
): SearchOutcome<T> {
  const tokens = norm(term).trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return { entries: [], total: 0 };

  const exact: Array<{ entry: IndexedName<T>; score: number }> = [];
  const seen = new Set<IndexedName<T>>();

  for (const entry of index) {
    const score = exactScore(entry, tokens);
    if (score === null) continue;
    exact.push({ entry, score });
    seen.add(entry);
  }

  exact.sort((a, b) => b.score - a.score);
  const combined: IndexedName<T>[] = exact.map(({ entry }) => entry);

  // A camada fuzzy nunca reordena nem remove os resultados exatos.
  if (combined.length < 5) {
    const fuzzy: Array<{ entry: IndexedName<T>; errors: number }> = [];
    for (const entry of index) {
      if (seen.has(entry)) continue;
      const errors = fuzzyErrors(entry, tokens);
      if (errors !== null) fuzzy.push({ entry, errors });
    }
    fuzzy.sort((a, b) => a.errors - b.errors);
    for (const { entry } of fuzzy) combined.push(entry);
  }

  return { entries: combined.slice(0, limit), total: combined.length };
}
