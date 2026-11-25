import { z } from "zod";

import { clientFieldsShape, requireCnpjWhenOn } from "./client";

export const receiptItemSchema = z.object({
  id: z.string(),
  desc: z.string(),
  valor: z.string(),
});

export const receiptItemsSchema = z
  .array(receiptItemSchema)
  .min(1, "Adicione pelo menos um item ao recibo.");

/** Formulário completo do recibo: bloco de cliente + itens. */
export const receiptFormSchema = z
  .object({ ...clientFieldsShape, items: receiptItemsSchema })
  .superRefine(requireCnpjWhenOn);

export type ReceiptFormValue = z.infer<typeof receiptFormSchema>;
