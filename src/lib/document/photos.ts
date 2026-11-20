import { toLoadedImage, type LoadedImage } from "@/lib/document/canvas";
import { productId } from "@/lib/format";

interface PhotoEntry {
  state: "loading" | "ok" | "err";
  image: LoadedImage | null;
  done: Promise<void>;
}

const PHOTOS = new Map<string, PhotoEntry>();
let listener: (() => void) | null = null;

/** A prévia se redesenha quando uma foto termina de carregar. */
export function setPhotoListener(fn: (() => void) | null): void {
  listener = fn;
}

function notify(): void {
  listener?.();
}

/** Corta a margem branca das fotos da loja para o produto ocupar a caixinha. */
function trimWhite(img: HTMLImageElement): LoadedImage {
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { source: img, width: W, height: H };
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, W, H).data;

  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (
        px[i + 3] > 20 &&
        (px[i] < 240 || px[i + 1] < 240 || px[i + 2] < 240)
      ) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { source: img, width: W, height: H };

  const pad = 2;
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(W - 1, x1 + pad);
  y1 = Math.min(H - 1, y1 + pad);
  const out = document.createElement("canvas");
  out.width = x1 - x0 + 1;
  out.height = y1 - y0 + 1;
  const octx = out.getContext("2d");
  if (!octx) return { source: img, width: W, height: H };
  octx.fillStyle = "#fff";
  octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(canvas, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return { source: out, width: out.width, height: out.height };
}

function photoEntry(slug: string | undefined): PhotoEntry | null {
  const id = productId(slug);
  if (!id) return null;

  const cached = PHOTOS.get(id);
  if (cached) return cached;

  const img = new Image();
  const created: PhotoEntry = {
    state: "loading",
    image: null,
    done: Promise.resolve(),
  };
  created.done = new Promise<void>((resolve) => {
    img.onload = () => {
      const loaded = img.naturalWidth ? toLoadedImage(img) : null;
      if (!loaded) {
        created.state = "err";
      } else {
        created.state = "ok";
        try {
          created.image = trimWhite(img);
        } catch {
          created.image = loaded;
        }
      }
      resolve();
      notify();
    };
    img.onerror = () => {
      created.state = "err";
      resolve();
      notify();
    };
  });
  img.decoding = "async";
  img.src = "/foto/" + id;
  PHOTOS.set(id, created);
  return created;
}

export function getPhoto(slug: string | undefined): PhotoEntry | null {
  return photoEntry(slug);
}

/** Espera as fotos do orçamento (no máximo 8 s) antes de gerar o PDF. */
export async function ensurePhotos(
  items: { slug?: string }[],
  enabled: boolean,
): Promise<void> {
  if (!enabled) return;
  const waits = items
    .map((item) => photoEntry(item.slug)?.done)
    .filter((p): p is Promise<void> => Boolean(p));
  if (!waits.length) return;
  await Promise.race([
    Promise.all(waits),
    new Promise((resolve) => setTimeout(resolve, 8000)),
  ]);
}

/** Reseta o cache (usado nos testes). */
export function resetPhotos(): void {
  PHOTOS.clear();
}
