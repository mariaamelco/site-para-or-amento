import { budget, expect, openBudget, test } from "./support/app";
import type { ReceiptDoc } from "../src/lib/types";

const receipt: ReceiptDoc = {
  cliente: "Mercado Bom Preço",
  data: "2026-02-09",
  cnpjOn: false,
  cnpj: "",
  items: [{ id: "r1", desc: "Instalação", valor: "300,00" }],
};

/** Exporta o documento atual e espera o histórico ser gravado. */
async function exportPdf(page: import("@playwright/test").Page) {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar PDF" }).click();
  await download;
  await expect(page.getByText(/Arquivo baixado:/)).toBeVisible();
}

test.describe("histórico de orçamentos", () => {
  test("abre filtrado por orçamentos e mostra o estado vazio", async ({
    page,
  }) => {
    await page.goto("/historico");

    await expect(page.getByRole("heading", { name: "Histórico" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Orçamentos/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(
      page.getByText("Nenhum orçamento salvo ainda."),
    ).toBeVisible();
  });

  test("o ícone do cabeçalho alterna entre orçamento e histórico", async ({
    page,
  }) => {
    await openBudget(page);

    await page.getByRole("link", { name: "Histórico" }).click();
    await expect(page).toHaveURL(/\/historico$/);

    await page.getByRole("link", { name: "Voltar para o orçamento" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("#o-cliente")).toBeVisible();
  });

  test("baixar o PDF guarda o documento no histórico", async ({ page }) => {
    await openBudget(page);
    await exportPdf(page);

    await page.getByRole("link", { name: "Histórico" }).click();

    const card = page.locator("[data-history-id]").first();
    await expect(card).toBeVisible();
    await expect(card).toContainText("Padaria Aurora");
    await expect(card).toContainText("09/02/2026");
    await expect(card).toContainText("R$ 89,90");

    await page.getByRole("tab", { name: /Recibos/ }).click();
    await expect(page.getByText("Nenhum recibo salvo ainda.")).toBeVisible();
  });

  test("pedir orçamento copia a lista de itens", async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await openBudget(page);
    await exportPdf(page);

    await page.getByRole("link", { name: "Histórico" }).click();
    await page
      .getByRole("button", { name: /Ações do orçamento/ })
      .click();
    await page.getByRole("menuitem", { name: "Pedir orçamento" }).click();

    await expect(
      page.getByText("Lista copiada. Agora é só colar no WhatsApp."),
    ).toBeVisible();

    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text.trim()).toMatch(/^Banner 3x2 m\s+1x$/);
  });

  test("o recibo exportado aparece só no filtro de recibos", async ({
    page,
  }) => {
    await page.addInitScript((seed) => {
      window.localStorage.setItem("jm_mode", JSON.stringify("rec"));
      window.localStorage.setItem("jm_rec", JSON.stringify(seed));
    }, receipt);

    await page.goto("/");
    await expect(page.locator("#r-cliente")).toBeVisible();
    await exportPdf(page);

    await page.getByRole("link", { name: "Histórico" }).click();
    await expect(
      page.getByText("Nenhum orçamento salvo ainda."),
    ).toBeVisible();

    await page.getByRole("tab", { name: /Recibos/ }).click();
    const card = page.locator("[data-history-id]").first();
    await expect(card).toContainText("Mercado Bom Preço");
    await expect(card).toContainText("R$ 300,00");

    await page.getByRole("button", { name: /Ações do recibo/ }).click();
    await expect(page.getByRole("menuitem", { name: "Abrir" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Baixar" })).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: "Pedir orçamento" }),
    ).toHaveCount(0);
  });
});

test.describe("histórico: PDF gerado de novo", () => {
  test("baixar pelo histórico reusa os dados salvos", async ({ page }) => {
    await openBudget(page, budget({ cliente: "João da Silva" }));
    await exportPdf(page);

    await page.getByRole("link", { name: "Histórico" }).click();
    await page.getByRole("button", { name: /Ações do orçamento/ }).click();

    const download = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Baixar" }).click();
    const file = await download;

    expect(file.suggestedFilename()).toBe(
      "Orçamento - João da Silva - 09-02-2026.pdf",
    );
  });
});

test.describe("histórico: lista virtualizada", () => {
  const SEEDED = 60;

  test("monta só os cards visíveis e alcança o último ao rolar", async ({
    page,
  }) => {
    await page.goto("/historico");
    await expect(
      page.getByText("Nenhum orçamento salvo ainda."),
    ).toBeVisible();

    // semeia direto no IndexedDB (o banco já foi criado pelo Dexie)
    await page.evaluate(async (seeded) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("jm_history");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const tx = db.transaction("entries", "readwrite");
      const store = tx.objectStore("entries");
      for (let i = 0; i < seeded; i++) {
        const cliente = `Cliente ${i}`;
        store.put({
          mode: "orc",
          id: `seed-${i}`,
          savedAt: new Date(Date.now() - i * 60_000).toISOString(),
          cliente,
          data: "2026-02-09",
          total: 100 + i,
          signature: { raw: null, clean: true, name: "" },
          doc: {
            cliente,
            data: "2026-02-09",
            cnpjOn: false,
            cnpj: "",
            items: [
              { id: `seed-item-${i}`, desc: "Banner 3x2 m", qty: "1", unit: "100,00" },
            ],
            unitCol: false,
            colTitle: "",
            obs: "",
            totMode: "auto",
            totManual: "",
            photos: false,
          },
        });
      }
      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(null);
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    }, SEEDED);

    await page.reload();
    await expect(page.getByText("Cliente 0")).toBeVisible();

    const cards = page.locator("[data-history-id]");
    const mounted = await cards.count();
    expect(mounted).toBeGreaterThan(0);
    expect(mounted).toBeLessThan(SEEDED);

    const list = page.locator("[data-history-list]");
    await list.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    await expect(page.getByText(`Cliente ${SEEDED - 1}`)).toBeVisible();
    expect(await cards.count()).toBeLessThan(SEEDED);
  });
});
