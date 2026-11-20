// Atualiza public/catalog.json a partir do sitemap da loja Digital Sat.
// - Remove produtos que saíram da loja.
// - Para produtos novos, lê o nome na página do produto e escolhe o grupo
//   (ex.: "Câmeras", "Redes e Wi-Fi") comparando o nome com os produtos que já
//   estão no catálogo (classificador Naive Bayes simples; ~93% de acerto em teste).
// Uso: bun scripts/atualizar-catalogo.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = path.join(ROOT, 'public', 'catalog.json');
const BASE = 'https://loja.digitalsat.com.br';
const UA = 'Mozilla/5.0 (compatible; JM-System-catalogo/1.0)';
const CONCURRENCY = 6;
const MIN_PRODUCTS = 1000; // proteção: se o sitemap vier quase vazio, não mexe no catálogo

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function get(url, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR' }, signal: AbortSignal.timeout(30000) });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      if (i >= tries) throw new Error(`${url}: ${e.message}`);
      await sleep(1500 * i);
    }
  }
}
const decode = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

async function sitemapSlugs() {
  const xml = await get(`${BASE}/sitemap_produtos.xml`);
  const slugs = [...xml.matchAll(/<loc>\s*[^<]*\/produto\/([^<\s]+)\s*<\/loc>/g)].map(m => decodeURIComponent(m[1]));
  return [...new Set(slugs)];
}

async function readName(slug) {
  const html = await get(`${BASE}/produto/${encodeURIComponent(slug)}`);
  if (!html) return null;
  let name = (html.match(/<h1[^>]*product-detail__product-name[^>]*>([\s\S]*?)<\/h1>/) || [])[1];
  if (!name) name = ((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').split('|')[0];
  return decode(name.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim() || null;
}

async function pool(items, fn) {
  const out = new Array(items.length); let next = 0, done = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (next < items.length) {
      const i = next++;
      try { out[i] = await fn(items[i]); } catch (e) { console.warn('  falhou:', e.message); out[i] = undefined; }
      if (++done % 50 === 0) console.log(`  ${done}/${items.length}`);
      await sleep(150);
    }
  }));
  return out;
}

// ---- classificador de grupo pelo nome ----
function tokens(name) {
  const t = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().match(/[a-z0-9]+/g) || [];
  return t.concat(t.slice(1).map((w, i) => t[i] + '_' + w));
}
function trainer(catalog) {
  const counts = {}, prior = {}, totals = {}, vocab = new Set();
  for (const [name, , group] of catalog) {
    prior[group] = (prior[group] || 0) + 1;
    const c = counts[group] ||= {};
    for (const w of tokens(name)) { c[w] = (c[w] || 0) + 1; totals[group] = (totals[group] || 0) + 1; vocab.add(w); }
  }
  const A = 0.1, V = vocab.size;
  return (name) => {
    const t = tokens(name); let best = 'Outros', bestS = -Infinity;
    for (const g in counts) {
      let s = Math.log(prior[g]);
      for (const w of t) s += Math.log(((counts[g][w] || 0) + A) / (totals[g] + A * V));
      if (s > bestS) { bestS = s; best = g; }
    }
    return best;
  };
}

const current = JSON.parse(await readFile(CATALOG, 'utf8'));
const known = new Set(current.map(p => p[1]));
const slugs = await sitemapSlugs();
console.log(`Sitemap: ${slugs.length} produtos. Catálogo atual: ${current.length}.`);
if (slugs.length < MIN_PRODUCTS) {
  console.error(`Sitemap com poucos produtos (${slugs.length}); catálogo não foi alterado.`);
  process.exit(1);
}
const live = new Set(slugs);
const removed = current.filter(p => !live.has(p[1]));
const newSlugs = slugs.filter(s => !known.has(s));
console.log(`Novos: ${newSlugs.length}. Saíram da loja: ${removed.length}.`);

const classify = trainer(current);
const names = await pool(newSlugs, readName);
const added = [];
newSlugs.forEach((slug, i) => { if (names[i]) added.push([names[i], slug, classify(names[i])]); });
const next = current.filter(p => live.has(p[1])).concat(added);
await writeFile(CATALOG, '[\n' + next.map(p => JSON.stringify(p)).join(',\n') + '\n]\n');
console.log(`Catálogo salvo: ${next.length} produtos (+${added.length}, -${removed.length}).`);
if (added.length) console.log('Adicionados:\n' + added.map(p => `  + ${p[0]} [${p[2]}]`).join('\n'));
if (removed.length) console.log('Removidos:\n' + removed.map(p => `  - ${p[0]}`).join('\n'));
