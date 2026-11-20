import { toLoadedImage, type LoadedImage } from "@/lib/document/canvas";

/**
 * Prepara a imagem da assinatura:
 * - reduz imagens gigantes;
 * - remove o fundo branco do papel (opcional);
 * - corta as bordas vazias.
 */
export function processSignature(
  src: string,
  clean: boolean,
): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const fit = Math.min(1, 1400 / Math.max(img.width, img.height));
      const W = Math.max(1, Math.round(img.width * fit));
      const H = Math.max(1, Math.round(img.height * fit));
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, W, H);
      const imageData = ctx.getImageData(0, 0, W, H);
      const px = imageData.data;

      if (clean) {
        // brilho do papel = luminância mediana; o que se aproxima vira transparente
        const hist = new Uint32Array(256);
        let total = 0;
        for (let i = 0; i < px.length; i += 4) {
          if (px[i + 3] < 10) continue;
          hist[(px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0]++;
          total++;
        }
        let acc = 0;
        let paper = 255;
        for (let v = 255; v >= 0; v--) {
          acc += hist[v];
          if (acc > total * 0.5) {
            paper = v;
            break;
          }
        }
        const hi = Math.max(60, paper - 28);
        const lo = Math.max(0, hi - 140);
        for (let i = 0; i < px.length; i += 4) {
          const l = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
          let a = (hi - l) / (hi - lo);
          a = a < 0 ? 0 : a > 1 ? 1 : a;
          a = Math.pow(a, 0.8) * (px[i + 3] / 255);
          px[i] = Math.round(px[i] * 0.55);
          px[i + 1] = Math.round(px[i + 1] * 0.55);
          px[i + 2] = Math.round(px[i + 2] * 0.6);
          px[i + 3] = Math.round(a * 255);
        }
        ctx.putImageData(imageData, 0, 0);
      }

      // corta as bordas vazias
      let x0 = W;
      let y0 = H;
      let x1 = -1;
      let y1 = -1;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const ink = clean
            ? px[i + 3] > 40
            : px[i + 3] > 40 &&
              (px[i] < 225 || px[i + 1] < 225 || px[i + 2] < 225);
          if (ink) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }
      if (x1 < 0) {
        reject(new Error("empty"));
        return;
      }

      const pad = Math.round(Math.max(W, H) * 0.01);
      x0 = Math.max(0, x0 - pad);
      y0 = Math.max(0, y0 - pad);
      x1 = Math.min(W - 1, x1 + pad);
      y1 = Math.min(H - 1, y1 + pad);

      const out = document.createElement("canvas");
      out.width = x1 - x0 + 1;
      out.height = y1 - y0 + 1;
      const outCtx = out.getContext("2d");
      if (!outCtx) {
        reject(new Error("canvas"));
        return;
      }
      outCtx.drawImage(canvas, x0, y0, out.width, out.height, 0, 0, out.width, out.height);

      const result = new Image();
      result.onload = () => {
        const loaded = toLoadedImage(result);
        if (loaded) resolve(loaded);
        else reject(new Error("load"));
      };
      result.onerror = () => reject(new Error("load"));
      result.src = out.toDataURL("image/png");
    };
    img.onerror = () => reject(new Error("load"));
    img.src = src;
  });
}

/** Reduz a assinatura para caber no armazenamento do navegador. */
export async function shrinkSignature(
  src: string,
  fileSize: number,
): Promise<string> {
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    const fit = Math.min(1, 1400 / Math.max(img.width, img.height));
    if (fit < 1 || fileSize > 1.5e6) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * fit));
      canvas.height = Math.max(1, Math.round(img.height * fit));
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/png");
      }
    }
  } catch {
    // mantém a imagem original
  }
  return src;
}
