import type { LoadedImage } from "@/lib/document/canvas";
import { renderBudgetPages } from "@/lib/document/budget";
import { renderReceiptPages } from "@/lib/document/receipt";
import type { BudgetDoc, Mode, ReceiptDoc } from "@/lib/types";

export interface RenderInput {
  mode: Mode;
  orc: BudgetDoc;
  rec: ReceiptDoc;
  header: LoadedImage | null;
  signature: LoadedImage | null;
  signerName: string;
}

export function renderPages(input: RenderInput, scale: number): HTMLCanvasElement[] {
  if (input.mode === "orc") {
    return renderBudgetPages(input.orc, input.header, scale);
  }
  return renderReceiptPages(
    input.rec,
    input.header,
    input.signature,
    input.signerName,
    scale,
  );
}
