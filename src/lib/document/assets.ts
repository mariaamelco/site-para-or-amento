import { loadImage, toLoadedImage, type LoadedImage } from "@/lib/document/canvas";
import { F_ARIAL, F_OPEN } from "@/lib/document/constants";

let headerPromise: Promise<LoadedImage | null> | null = null;

/** Carrega (uma única vez) o cabeçalho usado nos documentos. */
export function ensureHeaderImage(): Promise<LoadedImage | null> {
  if (!headerPromise) {
    headerPromise = loadImage("/header.png").then((img) =>
      img ? toLoadedImage(img) : null,
    );
  }
  return headerPromise;
}

/** Espera as fontes usadas no canvas (Arimo/Open Sans) carregarem. */
export async function ensureFonts(): Promise<void> {
  if (!document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`12px ${F_ARIAL}`),
      document.fonts.load(`bold 12px ${F_ARIAL}`),
      document.fonts.load(`12px ${F_OPEN}`),
      document.fonts.load(`bold 12px ${F_OPEN}`),
    ]);
    await document.fonts.ready;
  } catch {
    // segue com a fonte de fallback
  }
}
