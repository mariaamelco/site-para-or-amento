import { z } from "zod";

import { COMPANY_IDS, DEFAULT_COMPANY, type CompanyId } from "@/lib/companies";

/** Empresa válida: só as cadastradas em `COMPANIES`. */
export const companyIdSchema = z.enum(COMPANY_IDS);

/**
 * Lê a empresa salva (localStorage, histórico). Valor ausente ou desconhecido
 * volta para a J&M, que era a única empresa antes da troca existir.
 */
export function parseCompanyId(value: unknown): CompanyId {
  const parsed = companyIdSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_COMPANY;
}
