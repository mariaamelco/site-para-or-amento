import {
  createPageCanvas,
  hline,
  setFont,
  vline,
  wrap,
  type LoadedImage,
} from "@/lib/document/canvas";
import { F_ARIAL, F_OPEN, GREY, PW } from "@/lib/document/constants";
import type { Company } from "@/lib/companies";
import { drawClient, drawFooter, drawHeader, drawTotalBox } from "@/lib/document/header";
import { getPhoto } from "@/lib/document/photos";
import { drawTableHead } from "@/lib/document/table";
import { brDate, fmt, parseMoney } from "@/lib/format";
import { budgetTotal } from "@/lib/totals";
import type { BudgetDoc } from "@/lib/types";

interface Layout {
  xs: number[];
  heads: string[];
  unit: boolean;
  photo: boolean;
  /** índice da coluna de descrição (0 sem foto, 1 com foto) */
  d: number;
}

interface Row {
  lines: string[];
  h: number;
  photo: { state: "loading" | "ok" | "err"; image: LoadedImage | null } | null;
  P: number;
  qty: string;
  val: string;
}

interface Page {
  rows: Row[];
  first: boolean;
  tailOnly?: boolean;
}

function layoutBudget(doc: BudgetDoc): Layout {
  const unit = doc.unitCol;
  // a coluna "FOTO" só aparece se a opção estiver ligada e houver produto com foto
  const photo =
    doc.photos &&
    doc.items.some((item) => {
      const entry = getPhoto(item.slug);
      return entry && entry.state !== "err";
    });

  let xs = unit ? [45.7, 330.0, 430.0, 549.8] : [65.7, 359.7, 529.8];
  if (photo) {
    xs = unit ? [45.7, 103.7, 340.0, 440.0, 549.8] : [45.7, 103.7, 429.8, 549.8];
  }

  const heads = [doc.colTitle || "DESCRIÇÃO", "QUANTIDADE"];
  if (unit) heads.push("VALOR UNIT. (R$)");
  if (photo) heads.unshift("FOTO");

  return { xs, heads, unit, photo, d: photo ? 1 : 0 };
}

function rowsBudget(
  ctx: CanvasRenderingContext2D,
  doc: BudgetDoc,
  L: Layout,
  fontSize: number,
  lineHeight: number,
  minHeight: number,
): Row[] {
  setFont(ctx, fontSize, F_OPEN, true);
  const d = L.d;
  const descWidth = L.xs[d + 1] - L.xs[d] - 12;
  // tamanho da foto (pt), diminui junto com o texto
  const P = Math.min(L.xs[1] - L.xs[0] - 12, minHeight + 6);

  return doc.items.map((item) => {
    const entry = L.photo ? getPhoto(item.slug) : null;
    const hasPhoto = Boolean(entry) && entry?.state !== "err";
    const lines = wrap(ctx, item.desc || "", descWidth);
    const h = Math.max(
      minHeight,
      lines.length * lineHeight + (minHeight - lineHeight),
      hasPhoto ? P + 6 : 0,
    );
    const unit = parseMoney(item.unit);
    return {
      lines,
      h,
      photo: hasPhoto ? entry : null,
      P,
      qty: item.qty === "" || item.qty == null ? "" : String(item.qty),
      val: Number.isFinite(unit) ? fmt(unit) : "-",
    };
  });
}

export function renderBudgetPages(
  doc: BudgetDoc,
  header: LoadedImage | null,
  scale: number,
  company: Company,
): HTMLCanvasElement[] {
  const L = layoutBudget(doc);
  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) return [];
  const total = budgetTotal(doc);

  setFont(probe, 12, F_OPEN);
  const obsLines = doc.obs.trim()
    ? wrap(probe, "Observação: " + doc.obs.trim(), 360)
    : [];

  const LIMIT = 748;
  const headH = 35.4;
  const tailH =
    30 + 30.2 + (obsLines.length ? 34 + obsLines.length * 16.5 : 0);

  // escolhe a densidade que faz tudo caber em uma página, se possível
  const densities: [number, number, number][] = [
    [12, 15, 30],
    [11.5, 14, 26],
    [11, 13.5, 23],
    [10.5, 13, 21],
    [10, 12.5, 19],
  ];
  let D: [number, number, number] = densities[0];
  let rows: Row[] = [];
  const firstTop = doc.cnpjOn ? 345 : 325;
  for (const density of densities) {
    D = density;
    rows = rowsBudget(probe, doc, L, density[0], density[1], density[2]);
    const sum = rows.reduce((acc, row) => acc + row.h, 0);
    if (firstTop + headH + sum + tailH <= LIMIT) break;
  }

  // paginação
  const pages: Page[] = [];
  let current: Page = { rows: [], first: true };
  let y = firstTop + headH;
  for (const row of rows) {
    if (y + row.h > LIMIT && current.rows.length) {
      pages.push(current);
      current = { rows: [], first: false };
      y = 225 + headH;
    }
    current.rows.push(row);
    y += row.h;
  }
  let tailOnNew = false;
  if (y + tailH > LIMIT && rows.length) tailOnNew = true;
  pages.push(current);
  if (tailOnNew) pages.push({ rows: [], first: false, tailOnly: true });

  return pages.map((page, pageIndex) => {
    const { canvas, ctx } = createPageCanvas(scale);
    drawHeader(ctx, "ORÇAMENTO", header, company);

    let top: number;
    if (page.first) {
      drawClient(ctx, doc);
      top = firstTop;
    } else {
      ctx.fillStyle = GREY;
      setFont(ctx, 11, F_ARIAL);
      ctx.textAlign = "left";
      ctx.fillText(
        `Continuação — ${doc.cliente ? doc.cliente + " — " : ""}${brDate(doc.data)}`,
        59.5,
        214,
      );
      top = 225;
    }

    let yy = top;
    if (!page.tailOnly) {
      yy = drawTableHead(ctx, L.xs, L.heads, top, headH, 12, L.unit ? 0.6 : 1.2);
      ctx.fillStyle = GREY;
      if (!page.rows.length) {
        // tabela vazia: uma linha de espaço
        yy += D[2];
        hline(
          ctx,
          L.xs[0] - 0.45,
          L.xs[L.xs.length - 1] + 0.45,
          yy,
          0.9,
          GREY,
        );
      }
      for (const row of page.rows) {
        const mid = yy + row.h / 2;
        setFont(ctx, D[0], F_OPEN, true);
        ctx.fillStyle = GREY;
        ctx.textAlign = "center";
        const d = L.d;
        const descCenter = (L.xs[d] + L.xs[d + 1]) / 2;

        if (row.photo && row.photo.state === "ok" && row.photo.image) {
          const im = row.photo.image;
          const k = Math.min(row.P / im.width, row.P / im.height);
          const w = im.width * k;
          const h = im.height * k;
          ctx.drawImage(
            im.source,
            (L.xs[0] + L.xs[1]) / 2 - w / 2,
            mid - h / 2,
            w,
            h,
          );
        }

        const startY = mid - ((row.lines.length - 1) * D[1]) / 2 + D[0] * 0.36;
        row.lines.forEach((line, k) => ctx.fillText(line, descCenter, startY + k * D[1]));
        ctx.fillText(row.qty, (L.xs[d + 1] + L.xs[d + 2]) / 2, mid + D[0] * 0.36);
        if (L.unit) {
          ctx.fillText(row.val, (L.xs[d + 2] + L.xs[d + 3]) / 2, mid + D[0] * 0.36);
        }
        yy += row.h;
        hline(
          ctx,
          L.xs[0] - 0.45,
          L.xs[L.xs.length - 1] + 0.45,
          yy,
          0.9,
          GREY,
        );
      }
      for (const x of L.xs) vline(ctx, x, top, yy, 0.9, GREY);
    }

    const isLast = pageIndex === pages.length - 1;
    if (isLast) {
      const boxTop = page.tailOnly ? 235 : yy + 30;
      const boxBottom = drawTotalBox(ctx, boxTop, total);
      if (obsLines.length) {
        ctx.fillStyle = "#000";
        setFont(ctx, 12, F_OPEN);
        ctx.textAlign = "center";
        obsLines.forEach((line, k) =>
          ctx.fillText(line, PW / 2, boxBottom + 46 + k * 16.5),
        );
      }
    }

    if (pages.length > 1) {
      ctx.fillStyle = "#888";
      setFont(ctx, 9, F_ARIAL);
      ctx.textAlign = "right";
      ctx.fillText(`Página ${pageIndex + 1}/${pages.length}`, 550, 834);
    }
    drawFooter(ctx, company);
    return canvas;
  });
}
