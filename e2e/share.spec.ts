import type { Page } from "@playwright/test";

import { expect, openBudget, test } from "./support/app";

/**
 * No celular o PDF vai pelo compartilhamento do sistema com **só o arquivo**.
 * Baixar por link no iPhone fazia o WhatsApp receber também o endereço
 * "blob:https://…" junto com o PDF.
 */

interface ShareCall {
  keys: string[];
  files: { name: string; type: string }[];
}

/** Troca navigator.share/canShare por versões que registram as chamadas. */
async function mockShare(page: Page, firstError?: string) {
  await page.addInitScript((errorName: string | undefined) => {
    const calls: unknown[] = [];
    let failNext: string | undefined = errorName;
    (window as unknown as { __shareCalls: unknown[] }).__shareCalls = calls;
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: (data: { files?: File[] }) => !!data?.files?.length,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: Record<string, unknown>) => {
        calls.push({
          keys: Object.keys(data),
          files: ((data.files as File[]) ?? []).map((f) => ({ name: f.name, type: f.type })),
        });
        if (failNext) {
          const name = failNext;
          failNext = undefined;
          throw new DOMException("bloqueado", name);
        }
      },
    });
  }, firstError);
}

const shareCalls = (page: Page) =>
  page.evaluate(() => (window as unknown as { __shareCalls: ShareCall[] }).__shareCalls);

test.describe("celular", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test("compartilha só o arquivo PDF, sem link nem texto", async ({ page }) => {
    await mockShare(page);
    await openBudget(page);
    await page.getByRole("button", { name: "Baixar PDF" }).click();

    await expect(page.getByText(/^Enviado: Orçamento - Padaria Aurora/)).toBeVisible();
    const calls = await shareCalls(page);
    expect(calls).toHaveLength(1);
    expect(calls[0].keys).toEqual(["files"]);
    expect(calls[0].files).toEqual([
      { name: "Orçamento - Padaria Aurora - 09-02-2026.pdf", type: "application/pdf" },
    ]);
  });

  test("se o celular pedir outro toque, mostra o botão Enviar arquivo", async ({ page }) => {
    await mockShare(page, "NotAllowedError");
    await openBudget(page);
    await page.getByRole("button", { name: "Baixar PDF" }).click();

    const button = page.getByRole("button", { name: "Enviar arquivo" });
    await expect(button).toBeVisible();
    await button.click();
    await expect(button).toBeHidden();

    const calls = await shareCalls(page);
    expect(calls).toHaveLength(2);
    expect(calls[1].keys).toEqual(["files"]);
  });
});

test("no computador continua baixando o arquivo", async ({ page }) => {
  await mockShare(page);
  await openBudget(page);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Baixar PDF" }).click(),
  ]);
  expect(download).toBeTruthy();
  await expect(page.getByText(/^Arquivo baixado: Orçamento - Padaria Aurora/)).toBeVisible();
  expect(await shareCalls(page)).toHaveLength(0);
});
