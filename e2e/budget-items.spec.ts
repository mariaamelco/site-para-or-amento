import type { Locator } from "@playwright/test";

import { budget, expect, item, openBudget, test } from "./support/app";

/** Cor da borda renderizada — é o que o usuário vê como estado de erro. */
function borderColor(locator: Locator) {
  return locator.evaluate((el) => getComputedStyle(el).borderTopColor);
}

test.describe("validação dos itens do orçamento", () => {
  test("quantidade zerada deixa a linha inválida e bloqueia a exportação", async ({
    page,
  }) => {
    await openBudget(page);
    const qty = page.locator("#qty-item-1");
    await expect(qty).toHaveValue("1");

    await qty.fill("0");
    await expect(qty).toHaveAttribute("aria-invalid", "true");
    await expect(qty).toHaveAttribute("aria-describedby", "qty-item-1-error");
    await expect(page.locator("#qty-item-1-error")).toHaveText(
      "Quantidade deve ser maior que zero.",
    );
    await expect(page.getByRole("button", { name: "Baixar PDF" })).toBeDisabled();

    await qty.fill("2");
    await expect(qty).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#qty-item-1-error")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Baixar PDF" })).toBeEnabled();
  });

  test("valor unitário zerado deixa a linha inválida", async ({ page }) => {
    await openBudget(page);
    const unit = page.locator("#unit-item-1");
    await expect(unit).toHaveValue("89,90");

    await unit.fill("0");
    await expect(unit).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#unit-item-1-error")).toHaveText(
      "Valor unitário deve ser maior que zero.",
    );
    await expect(
      page.getByRole("button", { name: "Baixar imagem (PNG)" }),
    ).toBeDisabled();

    await unit.fill("89,90");
    await expect(unit).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#unit-item-1-error")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Baixar imagem (PNG)" }),
    ).toBeEnabled();
  });

  test("a borda do input muda de cor quando o campo fica inválido", async ({
    page,
  }) => {
    await openBudget(page);
    const qty = page.locator("#qty-item-1");

    const valida = await borderColor(qty);
    await qty.fill("0");
    await expect(qty).toHaveAttribute("aria-invalid", "true");
    await expect.poll(() => borderColor(qty)).not.toBe(valida);
  });

  test("cada item tem o próprio erro", async ({ page }) => {
    await openBudget(
      page,
      budget({
        items: [item(), item({ id: "item-2", desc: "Adesivo", unit: "10,00" })],
      }),
    );

    await page.locator("#qty-item-2").fill("0");

    await expect(page.locator("#qty-item-2-error")).toHaveText(
      "Quantidade deve ser maior que zero.",
    );
    await expect(page.locator("#qty-item-1-error")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Copiar imagem" })).toBeDisabled();
  });
});
