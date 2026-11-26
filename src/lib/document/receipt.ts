import {
  createPageCanvas,
  hline,
  setFont,
  vline,
  wrap,
  type LoadedImage,
} from "@/lib/document/canvas";
import { F_ARIAL, F_OPEN, GREY } from "@/lib/document/constants";
import type { Company } from "@/lib/companies";
import { drawClient, drawFooter, drawHeader, drawTotalBox } from "@/lib/document/header";
import { drawTableHead } from "@/lib/document/table";
import { brDate, brl, parseMoney } from "@/lib/format";
import { receiptTotal } from "@/lib/totals";
import type { ReceiptDoc, ReceiptItem } from "@/lib/types";

interface Row {
  item: ReceiptItem;
  lines: string[];
  h: number;
}

interface Page {
  rows: Row[];
  first: boolean;
  tailOnly?: boolean;
}

export function renderReceiptPages(
  doc: ReceiptDoc,
  header: LoadedImage | null,
  signature: LoadedImage | null,
  signerName: string,
  scale: number,
  company: Company,
): HTMLCanvasElement[] {
  const xs = [58.2, 427.5, 540.8];
  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) return [];

  const filled = doc.items.filter(
    (item) => (item.desc || "").trim() || Number.isFinite(parseMoney(item.valor)),
  );
  const list: ReceiptItem[] = filled.length
    ? filled
    : [{ id: "empty", desc: "", valor: "" }];

  const top1 = 373.2;
  const topN = 225;
  const headH = 50.7;
  const LIMIT = 748;
  const extra = list.length > 1 ? 22 + 30.2 : 0; // caixa do total
  const SIG_DEFAULT = 587.6;
  const SIG_H = 80; // bloco da assinatura (linha + nome)
  const sigLimit = 700 - SIG_H + 30;

  const rowsAt = (fontSize: number, lineHeight: number, minHeight: number) => {
    setFont(probe, fontSize, F_OPEN, true);
    return list.map((item) => {
      const lines = wrap(probe, item.desc, xs[1] - xs[0] - 12);
      return {
        item,
        lines,
        h: Math.max(minHeight, lines.length * lineHeight + (minHeight - lineHeight)),
      };
    });
  };

  // densidade: tenta caber tudo em uma página; se não couber, quebra em mais páginas
  const densities: [number, number, number][] = [
    [12, 15, 28.3],
    [11, 13.5, 24],
    [10, 12.5, 20],
  ];
  let D: [number, number, number] = densities[0];
  let rows: Row[] = [];
  for (const density of densities) {
    D = density;
    rows = rowsAt(density[0], density[1], density[2]);
    const sum = rows.reduce((acc, row) => acc + row.h, 0);
    if (top1 + headH + sum + extra + 30 <= sigLimit) break;
  }

  const pages: Page[] = [];
  let current: Page = { rows: [], first: true };
  let y = top1 + headH;
  for (const row of rows) {
    if (y + row.h > LIMIT && current.rows.length) {
      pages.push(current);
      current = { rows: [], first: false };
      y = topN + headH;
    }
    current.rows.push(row);
    y += row.h;
  }
  pages.push(current);
  if (y + extra + 30 > sigLimit) {
    pages.push({ rows: [], first: false, tailOnly: true });
  }

  const [fontSize, lineHeight] = D;

  return pages.map((page, pageIndex) => {
    const { canvas, ctx } = createPageCanvas(scale);
    drawHeader(ctx, "RECIBO", header, company);

    let top: number;
    if (page.first) {
      drawClient(ctx, doc);
      top = top1;
    } else {
      ctx.fillStyle = GREY;
      setFont(ctx, 11, F_ARIAL);
      ctx.textAlign = "left";
      ctx.fillText(
        `Continuação — ${doc.cliente ? doc.cliente + " — " : ""}${brDate(doc.data)}`,
        59.5,
        214,
      );
      top = topN;
    }

    let bottom = top;
    if (!page.tailOnly) {
      const lastX = xs[xs.length - 1];
      let yy = drawTableHead(
        ctx,
        xs,
        ["DESCRIÇÃO", "VALOR"],
        top,
        headH,
        12,
        0.25,
      );
      for (const row of page.rows) {
        const mid = yy + row.h / 2;
        setFont(ctx, fontSize, F_OPEN, true);
        ctx.fillStyle = GREY;
        ctx.textAlign = "center";
        const startY =
          mid - ((row.lines.length - 1) * lineHeight) / 2 + fontSize * 0.36;
        row.lines.forEach((line, k) =>
          ctx.fillText(line, (xs[0] + xs[1]) / 2, startY + k * lineHeight),
        );
        const value = parseMoney(row.item.valor);
        setFont(ctx, fontSize, F_ARIAL);
        ctx.fillText(
          Number.isFinite(value) ? brl(value) : "",
          (xs[1] + xs[2]) / 2,
          mid + fontSize * 0.36,
        );
        yy += row.h;
        hline(ctx, xs[0] - 0.45, lastX + 0.45, yy, 0.9, GREY);
      }
      for (const x of xs) vline(ctx, x, top, yy, 0.9, GREY);
      bottom = yy;
    }

    if (pageIndex === pages.length - 1) {
      if (list.length > 1) {
        bottom = drawTotalBox(
          ctx,
          page.tailOnly ? 235 : bottom + 22,
          receiptTotal(doc),
        );
      }
      // assinatura: fica na posição do modelo e só desce se a tabela for longa
      const sigTop = Math.max(
        page.tailOnly ? bottom + 40 : SIG_DEFAULT,
        bottom + 30,
      );
      const dy = sigTop - SIG_DEFAULT;

      if (signature) {
        const k = Math.min(200 / signature.width, 52 / signature.height);
        const w = signature.width * k;
        const h = signature.height * k;
        ctx.drawImage(signature.source, 295.7 - w / 2, 628.4 + dy - h, w, h);
      }
      hline(ctx, 184.9, 406.6, 629.7 + dy, 0.9, "#000");
      ctx.fillStyle = "#000";
      setFont(ctx, 12.2, F_ARIAL);
      ctx.textAlign = "center";
      ctx.fillText(signerName, 295.7, 659.6 + dy);
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
