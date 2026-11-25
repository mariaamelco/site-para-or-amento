import { test as base, expect, type Page } from "@playwright/test";

import type { BudgetDoc, BudgetItem } from "../../src/lib/types";

/** Cookie que o `proxy.ts` exige para liberar as rotas do app. */
const AUTH_COOKIE = { name: "jm_auth", value: "1" };

/**
 * Todo teste começa autenticado: grava o cookie direto no contexto em vez de
 * passar pela tela de login.
 */
export const test = base.extend({
  context: async ({ context, baseURL }, run) => {
    const url = baseURL ?? "http://127.0.0.1:3100";
    await context.addCookies([{ ...AUTH_COOKIE, url }]);
    await run(context);
  },
});

export { expect };

/** Item de orçamento válido. */
export function item(overrides: Partial<BudgetItem> = {}): BudgetItem {
  return {
    id: "item-1",
    desc: "Banner 3x2 m",
    qty: "1",
    unit: "89,90",
    ...overrides,
  };
}

/** Orçamento válido, para cada teste partir de um estado conhecido. */
export function budget(overrides: Partial<BudgetDoc> = {}): BudgetDoc {
  return {
    cliente: "Padaria Aurora",
    data: "2026-02-09",
    cnpjOn: false,
    cnpj: "",
    items: [item()],
    unitCol: true,
    colTitle: "DESCRIÇÃO",
    obs: "",
    totMode: "auto",
    totManual: "",
    photos: false,
    ...overrides,
  };
}

/**
 * Abre `/` com o orçamento semeado no `localStorage`. O `addInitScript` roda
 * antes do app ler o armazenamento e não sobrescreve o que os testes mudarem.
 */
export async function openBudget(page: Page, doc: BudgetDoc = budget()) {
  await page.addInitScript((seed) => {
    if (!window.localStorage.getItem("jm_orc")) {
      window.localStorage.setItem("jm_orc", JSON.stringify(seed));
    }
  }, doc);

  await page.goto("/");
  await expect(page.locator("#o-cliente")).toBeVisible();
}
