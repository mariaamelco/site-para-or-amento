import { drawSpaced, hline, setFont, spacedWidth } from "@/lib/document/canvas";
import { F_ARIAL, GREY } from "@/lib/document/constants";

/** Cabeçalho da tabela com linhas horizontais e títulos centralizados. */
export function drawTableHead(
  ctx: CanvasRenderingContext2D,
  xs: number[],
  heads: string[],
  top: number,
  height: number,
  fontSize: number,
  spacing: number,
): number {
  const lastX = xs[xs.length - 1];
  hline(ctx, xs[0] - 0.45, lastX + 0.45, top, 0.9, GREY);
  ctx.fillStyle = GREY;
  for (let c = 0; c < heads.length; c++) {
    const columnWidth = xs[c + 1] - xs[c] - 10;
    let size = fontSize;
    setFont(ctx, size, F_ARIAL);
    while (spacedWidth(ctx, heads[c], spacing) > columnWidth && size > 7) {
      size -= 0.5;
      setFont(ctx, size, F_ARIAL);
    }
    drawSpaced(
      ctx,
      heads[c],
      (xs[c] + xs[c + 1]) / 2,
      top + height / 2 + size * 0.3,
      spacing,
      "center",
    );
  }
  hline(ctx, xs[0] - 0.45, lastX + 0.45, top + height, 0.9, GREY);
  return top + height;
}
