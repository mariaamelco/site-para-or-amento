import { z } from "zod";

/** CNPJ mascarado (`00.000.000/0000-00`) ou vazio. */
const cnpjSchema = z.string().refine(
  (value) => value === "" || value.replace(/\D/g, "").length === 14,
  "Informe os 14 dígitos do CNPJ.",
);

/** Campos de cliente/data/CNPJ compartilhados pelos documentos. */
export const clientFieldsShape = {
  cliente: z.string().trim().min(1, "Informe o nome do cliente."),
  data: z.string().min(1, "Informe a data."),
  cnpjOn: z.boolean(),
  cnpj: cnpjSchema,
};

/** O CNPJ passa a ser obrigatório quando "Incluir CNPJ" está ligado. */
export function requireCnpjWhenOn(
  values: { cnpjOn: boolean; cnpj: string },
  ctx: z.RefinementCtx,
) {
  if (values.cnpjOn && !values.cnpj.replace(/\D/g, "")) {
    ctx.addIssue({
      code: "custom",
      path: ["cnpj"],
      message: "Informe o CNPJ do cliente.",
    });
  }
}

export const clientFieldsSchema = z
  .object(clientFieldsShape)
  .superRefine(requireCnpjWhenOn);

/** Valores do bloco de cliente, tipados pelo schema zod. */
export type ClientFieldsValue = z.infer<typeof clientFieldsSchema>;
