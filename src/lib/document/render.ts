import { getCompany, type CompanyId } from "@/lib/companies";
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
  /** Empresa que emite o documento (rodapé e cor do título). */
  company: CompanyId;
}

export function renderPages(input: RenderInput, scale: number): HTMLCanvasElement[] {
  const company = getCompany(input.company);
  if (input.mode === "orc") {
    return renderBudgetPages(input.orc, input.header, scale, company);
  }
  return renderReceiptPages(
    input.rec,
    input.header,
    input.signature,
    input.signerName,
    scale,
    company,
  );
}
