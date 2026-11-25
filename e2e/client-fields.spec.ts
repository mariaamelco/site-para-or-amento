import { budget, expect, openBudget, test } from "./support/app";

test.describe("validação dos campos do cliente", () => {
  test("campo intocado não mostra erro, mesmo inválido", async ({ page }) => {
    await openBudget(page, budget({ cliente: "" }));

    const cliente = page.locator("#o-cliente");
    await expect(cliente).toHaveValue("");
    await expect(cliente).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#o-cliente-error")).toHaveCount(0);
  });

  test("nome vazio fica inválido, com mensagem, e bloqueia a exportação", async ({
    page,
  }) => {
    await openBudget(page);
    const cliente = page.locator("#o-cliente");

    await cliente.fill("");
    await expect(cliente).toHaveAttribute("aria-invalid", "true");
    await expect(cliente).toHaveAttribute("aria-describedby", "o-cliente-error");
    await expect(page.locator("#o-cliente-error")).toHaveText(
      "Informe o nome do cliente.",
    );
    await expect(page.getByRole("button", { name: "Baixar PDF" })).toBeDisabled();

    await cliente.fill("Padaria Aurora");
    await expect(cliente).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#o-cliente-error")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Baixar PDF" })).toBeEnabled();
  });

  test("CNPJ mascarado só vale com os 14 dígitos", async ({ page }) => {
    await openBudget(page, budget({ cnpjOn: true }));

    const cnpj = page.locator("#o-cnpj-val");
    await expect(cnpj).toBeVisible();
    await expect(cnpj).not.toHaveAttribute("aria-invalid", "true");

    await cnpj.fill("1234567890123");
    await expect(cnpj).toHaveValue("12.345.678/9012-3");
    await expect(cnpj).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#o-cnpj-val-error")).toHaveText(
      "Informe os 14 dígitos do CNPJ.",
    );

    await cnpj.fill("12345678901234");
    await expect(cnpj).toHaveValue("12.345.678/9012-34");
    await expect(cnpj).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#o-cnpj-val-error")).toHaveCount(0);
  });
});
