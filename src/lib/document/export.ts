import { ensureFonts, ensureHeaderImage } from "@/lib/document/assets";
import type { LoadedImage } from "@/lib/document/canvas";
import { EXPORT_SCALE } from "@/lib/document/constants";
import { ensurePhotos } from "@/lib/document/photos";
import { renderPages } from "@/lib/document/render";
import { processSignature } from "@/lib/document/signature";
import type {
  BudgetDoc,
  Mode,
  ReceiptDoc,
  SignatureSettings,
} from "@/lib/types";

export interface ExportInput {
  mode: Mode;
  orc: BudgetDoc;
  rec: ReceiptDoc;
  signature: LoadedImage | null;
  signerName: string;
  /** Cabeçalho já carregado; sem ele, `ensureHeaderImage` busca de novo. */
  header?: LoadedImage | null;
}

/**
 * Prepara fontes, cabeçalho e fotos e renderiza as páginas na escala de
 * exportação (~200 dpi). Usado pela tela principal e pelo histórico.
 */
export async function renderExportPages(
  input: ExportInput,
): Promise<HTMLCanvasElement[]> {
  await ensureFonts();
  const header = input.header ?? (await ensureHeaderImage());
  const withPhotos = input.mode === "orc" && input.orc.photos;
  await ensurePhotos(input.mode === "orc" ? input.orc.items : [], withPhotos);

  return renderPages(
    {
      mode: input.mode,
      orc: input.orc,
      rec: input.rec,
      header,
      signature: input.signature,
      signerName: input.signerName,
    },
    EXPORT_SCALE,
  );
}

/** Assinatura salva (data URL) pronta para o canvas; `null` se não abrir. */
export async function loadSignature(
  settings: SignatureSettings,
): Promise<LoadedImage | null> {
  if (!settings.raw) return null;
  try {
    return await processSignature(settings.raw, settings.clean);
  } catch {
    return null;
  }
}
