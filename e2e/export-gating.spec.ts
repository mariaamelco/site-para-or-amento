import { budget, expect, openBudget, test } from "./support/app";

test.describe("exportação bloqueada enquanto o documento tem erro", () => {
  test("documento incompleto mantém PDF, imagem e cópia desabilitados", async ({
    page,
  }) => {
    await openBudget(page, budget({ cliente: "", items: [] }));

    await expect(page.getByRole("button", { name: "Baixar PDF" })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Baixar imagem (PNG)" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Copiar imagem" }),
    ).toBeDisabled();
    await expect(page.getByRole("button", { name: "Novo documento" })).toBeEnabled();
    await expect(
      page.getByText("Complete os dados do documento para exportar."),
    ).toBeVisible();
  });

  test("preencher cliente e item libera as exportações", async ({ page }) => {
    await openBudget(page, budget({ cliente: "", items: [] }));

    await page.getByLabel("Nome do cliente").fill("Padaria Aurora");
    await page.getByRole("button", { name: "Item personalizado" }).click();

    const linha = page.locator("[data-item-id]").first();
    await linha.getByLabel("Descrição do item 1").fill("Banner 3x2 m");
    await linha.locator("input[id^='unit-']").fill("89,90");

    await expect(page.getByRole("button", { name: "Baixar PDF" })).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Copiar imagem" }),
    ).toBeEnabled();
    await expect(
      page.getByText("Complete os dados do documento para exportar."),
    ).toHaveCount(0);
  });

  test("o recibo vazio também bloqueia as exportações", async ({ page }) => {
    await openBudget(page, budget());
    await page.getByRole("tab", { name: "Fazer recibo" }).click();

    await expect(page.getByRole("button", { name: "Baixar PDF" })).toBeDisabled();

    await page.getByLabel("Nome do cliente").fill("Padaria Aurora");
    await expect(page.getByRole("button", { name: "Baixar PDF" })).toBeEnabled();
  });
});
