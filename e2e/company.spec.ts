import { test as base, type Page } from "@playwright/test";

import { expect, openBudget, test } from "./support/app";

/**
 * Cor da faixa do título no cabeçalho do documento (prévia): vermelha na J&M,
 * prata na Vision Tech. Lê um pixel da faixa (x = 20 pt, y = 185 pt).
 */
async function headerStripeColor(page: Page) {
  const canvas = page.locator("canvas.doc-page").first();
  await expect(canvas).toBeVisible();
  return canvas.evaluate((el) => {
    const c = el as HTMLCanvasElement;
    const k = c.width / 595.5;
    const [r, g, b] = c.getContext("2d")!.getImageData(Math.round(20 * k), Math.round(185 * k), 1, 1).data;
    return { r, g, b };
  });
}

const isRed = ({ r, g, b }: { r: number; g: number; b: number }) => r > 150 && g < 90 && b < 90;
const isSilver = ({ r, g, b }: { r: number; g: number; b: number }) =>
  r > 110 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20;

test.describe("empresa que emite o documento", () => {
  test("começa na J&M e troca para a Vision Tech pelo cabeçalho", async ({ page }) => {
    await openBudget(page);
    await expect.poll(() => headerStripeColor(page).then(isRed)).toBe(true);

    await page.getByRole("button", { name: /Trocar empresa/ }).click();
    await page.getByRole("menuitemradio", { name: "Vision Tech" }).click();

    await expect(page.getByRole("img", { name: /Vision Tech/ })).toBeVisible();
    await expect.poll(() => headerStripeColor(page).then(isSilver)).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem("jm_company"))).toBe('"vision"');
    // O documento em edição continua o mesmo.
    await expect(page.locator("#o-cliente")).toHaveValue("Padaria Aurora");
  });

  test("cada empresa tem o próprio nome de assinante no recibo", async ({ page }) => {
    await openBudget(page);
    await page.getByRole("tab", { name: "Fazer recibo" }).click();
    const signer = page.locator("#sig-name");
    await signer.fill("Juliana Teste");

    await page.getByRole("button", { name: /Trocar empresa/ }).click();
    await page.getByRole("menuitemradio", { name: "Vision Tech" }).click();
    await expect(page.locator("#sig-name")).not.toHaveValue("Juliana Teste");

    await page.getByRole("button", { name: /Trocar empresa/ }).click();
    await page.getByRole("menuitemradio", { name: "J&M System" }).click();
    await expect(page.locator("#sig-name")).toHaveValue("Juliana Teste");
  });

  test("o histórico guarda a empresa do documento", async ({ page }) => {
    await openBudget(page);
    await page.getByRole("button", { name: /Trocar empresa/ }).click();
    await page.getByRole("menuitemradio", { name: "Vision Tech" }).click();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Baixar PDF" }).click();
    await download;
    await expect(page.getByText(/Arquivo baixado:/)).toBeVisible();

    await page.getByRole("link", { name: "Histórico" }).click();
    await expect(page.locator("[data-history-id]").first()).toContainText("Vision Tech");
  });
});

base("na tela de login dá para escolher a empresa", async ({ page }) => {
  await page.goto("/auth");
  const vision = page.getByRole("radio", { name: "Vision Tech" });
  await expect(page.getByRole("radio", { name: "J&M System" })).toHaveAttribute("aria-checked", "true");

  await vision.click();
  await expect(vision).toHaveAttribute("aria-checked", "true");

  await page.locator("#lg-user").fill("Juliana");
  await page.locator("#lg-pass").fill("jm1416");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: /Empresa: Vision Tech/ })).toBeVisible();
});
