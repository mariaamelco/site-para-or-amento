import { fitText, hline, setFont, drawSpaced, type LoadedImage } from "@/lib/document/canvas";
import type { Company } from "@/lib/companies";
import { F_ARIAL, GREY, PH, PW } from "@/lib/document/constants";
import { brDate, brl } from "@/lib/format";
import type { BudgetDoc, ReceiptDoc } from "@/lib/types";

export function drawHeader(
  ctx: CanvasRenderingContext2D,
  title: string,
  header: LoadedImage | null,
  company: Company,
): void {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, PW, PH);
  if (header) {
    ctx.drawImage(header.source, 0, 0, PW, (PW * header.height) / header.width);
  } else {
    ctx.fillStyle = company.fallback.band;
    ctx.fillRect(0, 0, PW, 157);
    ctx.fillStyle = company.fallback.stripe;
    ctx.fillRect(0, 156.4, PW, 40.8);
  }
  ctx.fillStyle = company.titleColor;
  setFont(ctx, 26, F_ARIAL);
  drawSpaced(ctx, title, 60.1, 181.5, 9.75, "left");
}

export function drawFooter(ctx: CanvasRenderingContext2D, company: Company): void {
  ctx.fillStyle = "#000";
  setFont(ctx, 10, F_ARIAL);
  ctx.textAlign = "center";
  // Linha vazia (ex.: Vision Tech sem e-mail) não deixa buraco no rodapé.
  const lines = ["Contato", company.phone, company.email, company.cnpj].filter(Boolean);
  lines.forEach((text, i) => ctx.fillText(text, PW / 2, 771.2 + i * 14));
}

export function drawClient(
  ctx: CanvasRenderingContext2D,
  doc: BudgetDoc | ReceiptDoc,
): number {
  ctx.fillStyle = GREY;
  setFont(ctx, 13, F_ARIAL);
  ctx.textAlign = "left";
  ctx.fillText("Data:", 311.8, 243.6);
  hline(ctx, 345.4, 535.2, 246.2, 1, GREY);
  ctx.fillStyle = "#000";
  setFont(ctx, 12, F_ARIAL);
  ctx.fillText(brDate(doc.data), 391.5, 243.4);

  ctx.fillStyle = GREY;
  setFont(ctx, 13, F_ARIAL);
  ctx.fillText("Cliente:", 59.5, 277.3);
  hline(ctx, 110.8, 535.7, 279.9, 1, GREY);
  if (doc.cliente) {
    ctx.fillStyle = "#000";
    setFont(ctx, 12, F_ARIAL);
    ctx.fillText(fitText(ctx, doc.cliente, 535.7 - 114), 113.9, 276);
  }

  let bottom = 281;
  if (doc.cnpjOn) {
    ctx.fillStyle = GREY;
    setFont(ctx, 13, F_ARIAL);
    ctx.fillText("CNPJ:", 59.5, 307.3);
    hline(ctx, 99.5, 300, 309.9, 1, GREY);
    if (doc.cnpj) {
      ctx.fillStyle = "#000";
      setFont(ctx, 12, F_ARIAL);
      ctx.fillText(doc.cnpj, 102.5, 306);
    }
    bottom = 311;
  }
  return bottom;
}

export function drawTotalBox(
  ctx: CanvasRenderingContext2D,
  top: number,
  value: number,
): number {
  setFont(ctx, 14, F_ARIAL, true);
  const text = brl(value);
  const w = Math.max(123.3, ctx.measureText(text).width + 36);
  const h = 30.2;
  const x = PW / 2 - w / 2;
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, top, w, h);
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.fillText(text, PW / 2, top + h / 2 + 5);
  return top + h;
}
