import { PH, PW } from "@/lib/document/constants";

export interface LoadedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
}

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function toLoadedImage(img: HTMLImageElement): LoadedImage | null {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  return width && height ? { source: img, width, height } : null;
}

export function setFont(
  ctx: CanvasRenderingContext2D,
  size: number,
  family: string,
  bold = false,
): void {
  ctx.font = `${bold ? "700 " : ""}${size}px ${family}`;
}

export function spacedWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  spacing: number,
): number {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacing;
  return w - (text.length ? spacing : 0);
}

export function drawSpaced(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: "left" | "center" | "right" = "left",
): void {
  const w = spacedWidth(ctx, text, spacing);
  let cx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  ctx.textAlign = "left";
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
}

export function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const out: string[] = [];
  for (const para of String(text || "").split(/\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? line + " " + word : word;
      if (ctx.measureText(candidate).width <= maxWidth || !line) {
        if (!line && ctx.measureText(word).width > maxWidth) {
          // quebra palavras muito longas
          let part = "";
          for (const ch of word) {
            if (part && ctx.measureText(part + ch).width > maxWidth) {
              out.push(part);
              part = ch;
            } else {
              part += ch;
            }
          }
          line = part;
        } else {
          line = candidate;
        }
      } else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

export function hline(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y: number,
  width: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(x0, y - width / 2, x1 - x0, width);
}

export function vline(
  ctx: CanvasRenderingContext2D,
  x: number,
  y0: number,
  y1: number,
  width: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(x - width / 2, y0, width, y1 - y0);
}

export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

export const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      type,
      quality,
    ),
  );

export function createPageCanvas(scale: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(PW * scale);
  canvas.height = Math.round(PH * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não disponível");
  ctx.scale(scale, scale);
  ctx.textBaseline = "alphabetic";
  return { canvas, ctx };
}
