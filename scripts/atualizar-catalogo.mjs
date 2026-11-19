// Atualiza catalog.json a partir do sitemap da loja Digital Sat.
// - Remove produtos que saíram da loja.
// - Para produtos novos, lê a página do produto (nome + categoria da loja)
//   e converte a categoria da loja no grupo usado no site (scripts/mapa-categorias.json).
// Uso: node scripts/atualizar-catalogo.mjs            (atualiza)
//      node scripts/atualizar-catalogo.mjs --mapear   (lê todos os produtos e refaz o mapa de categorias)
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = path.join(ROOT, 'catalog.json');
const MAP = path.join(ROOT, 'scripts', 'mapa-categorias.json');
const BASE = 'https://loja.digitalsat.com.br';
const UA = 'Mozilla/5.0 (compatible; JM-System-catalogo/1.0)';
const CONCURRENCY = 4;
const MIN_PRODUCTS = 1000; // proteção: se o sitemap vier quase vazio, não mexe no catálogo

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function get(url, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR' } });
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

async function readProduct(slug) {
  const html = await get(`${BASE}/produto/${encodeURIComponent(slug)}`);
  if (!html) return null;
  let name = (html.match(/<h1[^>]*product-detail__product-name[^>]*>([\s\S]*?)<\/h1>/) || [])[1];
  if (!name) name = ((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').split('|')[0];
  name = decode(name.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
  const crumbs = [...html.matchAll(/breadcrumbs__list-item-link[^>]*href="\/categoria\/([^"]+)"/g)].map(m => m[1]);
  return name ? { name, storeCat: crumbs.length ? crumbs[crumbs.length - 1] : '' } : null;
}

async function pool(items, fn) {
  const out = new Array(items.length); let next = 0, done = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (next < items.length) {
      const i = next++;
      try { out[i] = await fn(items[i]); } catch (e) { console.warn('  falhou:', e.message); out[i] = undefined; }
      if (++done % 100 === 0) console.log(`  ${done}/${items.length}`);
      await sleep(150);
    }
  }));
  return out;
}

const current = JSON.parse(await readFile(CATALOG, 'utf8'));
const bySlug = new Map(current.map(p => [p[1], p]));

if (process.argv.includes('--mapear')) {
  // Lê todos os produtos do catálogo atual e descobre, para cada categoria da loja, o grupo mais comum.
  console.log(`Lendo ${current.length} produtos para montar o mapa de categorias…`);
  const info = await pool(current.map(p => p[1]), readProduct);
  const votes = {};
  current.forEach((p, i) => {
    const sc = info[i] && info[i].storeCat; if (!sc) return;
    (votes[sc] ||= {})[p[2]] = ((votes[sc] || {})[p[2]] || 0) + 1;
  });
  const map = Object.fromEntries(Object.entries(votes).sort().map(([sc, v]) =>
    [sc, Object.entries(v).sort((a, b) => b[1] - a[1])[0][0]]));
  await writeFile(MAP, JSON.stringify(map, null, 2) + '\n');
  console.log(`Mapa salvo com ${Object.keys(map).length} categorias da loja.`);
  process.exit(0);
}

const map = JSON.parse(await readFile(MAP, 'utf8'));
const slugs = await sitemapSlugs();
console.log(`Sitemap: ${slugs.length} produtos. Catálogo atual: ${current.length}.`);
if (slugs.length < MIN_PRODUCTS) {
  console.error(`Sitemap com poucos produtos (${slugs.length}); catálogo não foi alterado.`);
  process.exit(1);
}
const live = new Set(slugs);
const removed = current.filter(p => !live.has(p[1]));
const newSlugs = slugs.filter(s => !bySlug.has(s));
console.log(`Novos: ${newSlugs.length}. Saíram da loja: ${removed.length}.`);

const info = await pool(newSlugs, readProduct);
const added = [];
newSlugs.forEach((slug, i) => {
  const p = info[i]; if (!p) return;
  added.push([p.name, slug, map[p.storeCat] || 'Outros']);
});
const next = current.filter(p => live.has(p[1])).concat(added);
const out = '[\n' + next.map(p => JSON.stringify(p)).join(',\n') + '\n]\n';
await writeFile(CATALOG, out);
console.log(`Catálogo salvo: ${next.length} produtos (+${added.length}, -${removed.length}).`);
if (added.length) console.log('Adicionados:\n' + added.map(p => `  + ${p[0]} [${p[2]}]`).join('\n'));
if (removed.length) console.log('Removidos:\n' + removed.map(p => `  - ${p[0]}`).join('\n'));
