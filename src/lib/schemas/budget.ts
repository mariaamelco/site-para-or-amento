import { z } from "zod";

import { parseMoney } from "@/lib/format";
import type { BudgetItem } from "@/lib/types";
import { clientFieldsShape, requireCnpjWhenOn } from "./client";

const positiveMoney = (message: string) =>
  z.string().refine((value) => {
    const parsed = parseMoney(value);
    return Number.isFinite(parsed) && parsed > 0;
  }, message);

export const budgetItemSchema = z.object({
  id: z.string(),
  slug: z.string().optional(),
  desc: z.string(),
  qty: positiveMoney("Quantidade deve ser maior que zero."),
  unit: positiveMoney("Valor unitário deve ser maior que zero."),
});

export const budgetItemsSchema = z
  .array(budgetItemSchema)
  .min(1, "Adicione pelo menos um item ao orçamento.");

/** Formulário completo do orçamento: bloco de cliente + itens. */
export const budgetFormSchema = z
  .object({ ...clientFieldsShape, items: budgetItemsSchema })
  .superRefine(requireCnpjWhenOn);

export type BudgetFormValue = z.infer<typeof budgetFormSchema>;

/** Regra: um produto do catálogo entra no orçamento uma única vez. */
export const addBudgetProductSchema = z
  .object({
    slug: z.string(),
    items: z.array(z.object({ slug: z.string().optional() })),
  })
  .refine(
    ({ slug, items }) => !items.some((item) => item.slug === slug),
    "Este produto já está adicionado ao orçamento.",
  );

export const addedProductSlugs = (
  items: readonly BudgetItem[],
): Set<string> =>
  new Set(items.flatMap((item) => (item.slug ? [item.slug] : [])));

export function canAddBudgetProduct(
  slug: string,
  items: readonly BudgetItem[],
): boolean {
  return addBudgetProductSchema.safeParse({ slug, items }).success;
}

export type BudgetItemsValidation =
  | { ok: true }
  | { ok: false; message: string; fieldId?: string };

export function validateBudgetItems(
  items: readonly BudgetItem[],
): BudgetItemsValidation {
  const result = budgetItemsSchema.safeParse(items);
  if (result.success) return { ok: true };

  const issue = result.error.issues[0];
  const [index, field] = issue.path;
  const itemIndex = typeof index === "number" ? index : -1;
  const item = itemIndex >= 0 ? items[itemIndex] : undefined;
  const prefix = item ? `Item ${itemIndex + 1}: ` : "";
  const fieldId =
    item && (field === "qty" || field === "unit")
      ? `${field}-${item.id}`
      : undefined;

  return { ok: false, message: prefix + issue.message, fieldId };
}
