import { getCompany, type CompanyId } from "@/lib/companies";
import { loadImage, toLoadedImage, type LoadedImage } from "@/lib/document/canvas";
import { F_ARIAL, F_OPEN } from "@/lib/document/constants";

const headerPromises = new Map<CompanyId, Promise<LoadedImage | null>>();

/** Carrega (uma única vez por empresa) o cabeçalho usado nos documentos. */
export function ensureHeaderImage(company: CompanyId): Promise<LoadedImage | null> {
  let promise = headerPromises.get(company);
  if (!promise) {
    promise = loadImage(getCompany(company).headerSrc).then((img) =>
      img ? toLoadedImage(img) : null,
    );
    headerPromises.set(company, promise);
  }
  return promise;
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
