/** Normaliza para busca: sem acentos, minúsculas. */
export const norm = (s: string | null | undefined) =>
  (s || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function parseMoney(s: unknown): number {
  if (s == null) return NaN;
  let v = String(s).trim().replace(/R\$\s?/i, "").replace(/\s/g, "");
  if (!v) return NaN;
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(v)) v = v.replace(/\./g, "");
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : NaN;
}

export const fmt = (n: number) =>
  (Math.round(n * 100) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const brl = (n: number) => "R$ " + fmt(n);

export function qtyNum(q: string | null | undefined): number | null {
  const n = parseMoney(q);
  return Number.isFinite(n) ? n : null;
}

export function todayISO(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function brDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function maskCNPJ(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  let out = d.slice(0, 2);
  if (d.length > 2) out += "." + d.slice(2, 5);
  if (d.length > 5) out += "." + d.slice(5, 8);
  if (d.length > 8) out += "/" + d.slice(8, 12);
  if (d.length > 12) out += "-" + d.slice(12, 14);
  return out;
}

/** Id do produto no fim do slug da loja (ex.: "camera-vhd-1120-1234" → "1234"). */
export function productId(slug: string | undefined): string | null {
  const m = /-(\d+)$/.exec(slug || "");
  return m ? m[1] : null;
}

/** Foto do produto direto da loja Digital Sat. */
export function productImageUrl(slug: string | undefined, size: number): string {
  const id = productId(slug);
  return id
    ? `https://loja.digitalsat.com.br/imagem/produto/id/${id}/width/${size}/height/${size}/index/0`
    : "";
}

/** Imagem cinza usada quando o produto não tem foto ou a loja não responde. */
export const NO_IMAGE =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="#f4f4f5"/><g fill="none" stroke="#c7c7cc" stroke-width="2"><rect x="11" y="14" width="26" height="20" rx="3"/><circle cx="19" cy="21" r="3"/><path d="M37 30l-8-8-12 12"/></g></svg>',
  );

let uid = 1;
export const newId = () => "i" + uid++ + Date.now().toString(36);
