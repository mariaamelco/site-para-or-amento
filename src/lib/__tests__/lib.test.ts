import { describe, expect, test } from "bun:test";

import {
  catalogCategories,
  highlightSegments,
  parseCatalog,
  searchProducts,
} from "@/lib/catalog";
import { COMPANY_IDS, getCompany } from "@/lib/companies";
import { documentName } from "@/lib/document/download";
import { companyIdSchema, parseCompanyId } from "@/lib/schemas/company";
import { signatureKeys } from "@/lib/storage";
import { defaultBudget, defaultReceipt } from "@/lib/documents";
import { brDate, fmt, maskCNPJ, parseMoney, productId } from "@/lib/format";
import { historyEntryFrom, quoteText } from "@/lib/history";
import {
  HISTORY_TTL_DAYS,
  HISTORY_TTL_MS,
  historyEntryExpired,
  historyEntrySchema,
} from "@/lib/schemas/history";
import {
  addedProductSlugs,
  budgetFormSchema,
  canAddBudgetProduct,
  validateBudgetItems,
} from "@/lib/schemas/budget";
import { receiptFormSchema } from "@/lib/schemas/receipt";
import { formErrors, formIsValid } from "@/lib/form";
import { budgetTotal, receiptTotal } from "@/lib/totals";
import type { BudgetDoc, BudgetItem } from "@/lib/types";

describe("parseMoney", () => {
  test("aceita os formatos digitados pelo usuário", () => {
    expect(parseMoney("R$ 1.234,56")).toBeCloseTo(1234.56);
    expect(parseMoney("1234,56")).toBeCloseTo(1234.56);
    expect(parseMoney("1,5")).toBeCloseTo(1.5);
    expect(parseMoney("1.234")).toBe(1234);
    expect(parseMoney("89.90")).toBeCloseTo(89.9);
    expect(parseMoney(" 250 ")).toBe(250);
  });

  test("devolve NaN para entradas vazias ou inválidas", () => {
    expect(parseMoney("")).toBeNaN();
    expect(parseMoney("   ")).toBeNaN();
    expect(parseMoney(null)).toBeNaN();
    expect(parseMoney("abc")).toBeNaN();
  });
});

describe("formatadores", () => {
  test("fmt usa o padrão brasileiro", () => {
    expect(fmt(1234.5)).toBe("1.234,50");
    expect(fmt(0.1 + 0.2)).toBe("0,30");
  });

  test("brDate converte ISO em dd/mm/aaaa", () => {
    expect(brDate("2026-02-09")).toBe("09/02/2026");
    expect(brDate("")).toBe("");
  });

  test("maskCNPJ formata progressivamente", () => {
    expect(maskCNPJ("12345678000199")).toBe("12.345.678/0001-99");
    expect(maskCNPJ("123")).toBe("12.3");
    expect(maskCNPJ("12.345.678/0001-99")).toBe("12.345.678/0001-99");
    expect(maskCNPJ("123456789012345678")).toBe("12.345.678/9012-34");
  });

  test("productId extrai o id do fim do slug", () => {
    expect(productId("camera-vhd-1120-1234")).toBe("1234");
    expect(productId("sem-numero")).toBeNull();
    expect(productId(undefined)).toBeNull();
  });
});

const catalog = parseCatalog([
  ["Câmera VHD 1120", "camera-vhd-1120-1234", "Câmeras"],
  ["Câmera Intelbras VIP", "camera-intelbras-vip-5678", "Câmeras"],
  ["Cabo HDMI 2m", "cabo-hdmi-2m-9012", "Cabos"],
  ["Fonte 12V", "fonte-12v-3456", "Fontes"],
]);

describe("searchProducts", () => {
  test("sem termo e sem categoria não retorna nada", () => {
    expect(searchProducts(catalog, "", "")).toEqual({ results: [], total: 0 });
  });

  test("todas as palavras precisam aparecer", () => {
    const { results } = searchProducts(catalog, "camera vhd", "");
    expect(results.map((p) => p.slug)).toEqual(["camera-vhd-1120-1234"]);
  });

  test("ignora acentos e maiúsculas", () => {
    const { results } = searchProducts(catalog, "CÂMERA", "");
    expect(results).toHaveLength(2);
  });

  test("filtra por categoria", () => {
    const { results } = searchProducts(catalog, "camera", "Câmeras");
    expect(results).toHaveLength(2);
    expect(searchProducts(catalog, "camera", "Cabos").total).toBe(0);
  });

  test("o limite corta a lista mas não a contagem", () => {
    const { results, total } = searchProducts(catalog, "camera", "", 1);
    expect(results).toHaveLength(1);
    expect(total).toBe(2);
  });

  test("catalogCategories vem ordenado e sem repetição", () => {
    expect(catalogCategories(catalog)).toEqual(["Cabos", "Câmeras", "Fontes"]);
  });
});

describe("highlightSegments", () => {
  test("marca os trechos encontrados mantendo o texto original", () => {
    const segments = highlightSegments("Câmera VHD", ["camera"]);
    expect(segments.map((s) => s.text).join("")).toBe("Câmera VHD");
    expect(segments[0]).toEqual({ text: "Câmera", hit: true });
    expect(segments[1]).toEqual({ text: " VHD", hit: false });
  });

  test("acentos não deslocam as posições", () => {
    const segments = highlightSegments("Câmera", ["mera"]);
    expect(segments).toEqual([
      { text: "Câ", hit: false },
      { text: "mera", hit: true },
    ]);
  });

  test("termos curtos são ignorados", () => {
    expect(highlightSegments("Cabo", ["a"])).toEqual([
      { text: "Cabo", hit: false },
    ]);
  });
});

describe("totais", () => {
  const base = (patch: Partial<BudgetDoc>): BudgetDoc => ({
    ...defaultBudget(),
    ...patch,
  });

  test("orçamento soma quantidade x unitário", () => {
    const doc = base({
      items: [
        { id: "1", desc: "Cabo", qty: "2", unit: "10,50" },
        { id: "2", desc: "Fonte", qty: "", unit: "R$ 89,90" },
      ],
    });
    expect(budgetTotal(doc)).toBeCloseTo(110.9);
  });

  test("quantidade inválida conta como 1", () => {
    const doc = base({
      items: [{ id: "1", desc: "X", qty: "abc", unit: "50" }],
    });
    expect(budgetTotal(doc)).toBe(50);
  });

  test("modo manual ignora os itens", () => {
    const doc = base({
      totMode: "man",
      totManual: "1.500,00",
      items: [{ id: "1", desc: "X", qty: "2", unit: "10" }],
    });
    expect(budgetTotal(doc)).toBe(1500);
    expect(budgetTotal(base({ totMode: "man", totManual: "" }))).toBe(0);
  });

  test("recibo soma os valores lançados", () => {
    const doc = defaultReceipt();
    doc.items = [
      { id: "1", desc: "Instalação", valor: "300,00" },
      { id: "2", desc: "Material", valor: "150,50" },
      { id: "3", desc: "", valor: "" },
    ];
    expect(receiptTotal(doc)).toBeCloseTo(450.5);
  });
});

describe("documentName", () => {
  test("monta o nome com cliente e data", () => {
    const doc = {
      ...defaultBudget(),
      cliente: "João da Silva",
      data: "2026-02-09",
    };
    expect(documentName("orc", doc, "pdf", 1, 1)).toBe(
      "Orçamento - João da Silva - 09-02-2026.pdf",
    );
  });

  test("remove caracteres inválidos e adiciona a página", () => {
    const doc = {
      ...defaultBudget(),
      cliente: 'Loja A/B: "Centro"',
      data: "2026-02-09",
    };
    expect(documentName("rec", doc, "png", 2, 3)).toBe(
      "Recibo - Loja A B Centro - 09-02-2026 (página 2).png",
    );
  });

  test("sem cliente o nome continua válido", () => {
    const doc = { ...defaultBudget(), cliente: "  ", data: "2026-02-09" };
    expect(documentName("rec", doc, "pdf", 1, 1)).toBe("Recibo - 09-02-2026.pdf");
  });
});

const budgetItem = (patch: Partial<BudgetItem> = {}): BudgetItem => ({
  id: "i1",
  desc: "Cabo",
  qty: "1",
  unit: "10",
  ...patch,
});

describe("validação do orçamento (zod)", () => {
  test("exige pelo menos um item", () => {
    const result = validateBudgetItems([]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe("Adicione pelo menos um item ao orçamento.");
  });

  test("quantidade precisa ser maior que zero", () => {
    const result = validateBudgetItems([budgetItem({ qty: "0" })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe("Item 1: Quantidade deve ser maior que zero.");
    expect(result.fieldId).toBe("qty-i1");
  });

  test("valor unitário precisa ser maior que zero", () => {
    const result = validateBudgetItems([
      budgetItem({ id: "i1", unit: "10" }),
      budgetItem({ id: "i2", unit: "0" }),
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe(
      "Item 2: Valor unitário deve ser maior que zero.",
    );
    expect(result.fieldId).toBe("unit-i2");
  });

  test("aceita valores positivos no formato brasileiro", () => {
    expect(
      validateBudgetItems([budgetItem({ qty: "1,5", unit: "R$ 89,90" })]),
    ).toEqual({ ok: true });
  });
});

describe("validade do documento", () => {
  test("orçamento com cliente e item válido", () => {
    const doc: BudgetDoc = {
      ...defaultBudget(),
      cliente: "Padaria Aurora",
      items: [budgetItem({ qty: "2", unit: "R$ 89,90" })],
    };

    expect(formErrors(budgetFormSchema, doc)).toEqual({});
    expect(formIsValid(formErrors(budgetFormSchema, doc))).toBe(true);
  });

  test("orçamento vazio fica inválido", () => {
    const errors = formErrors(budgetFormSchema, defaultBudget());

    expect(errors.cliente).toBe("Informe o nome do cliente.");
    expect(errors.items).toBe("Adicione pelo menos um item ao orçamento.");
    expect(formIsValid(errors)).toBe(false);
  });

  test("quantidade zerada invalida o documento", () => {
    const doc: BudgetDoc = {
      ...defaultBudget(),
      cliente: "Padaria Aurora",
      items: [budgetItem({ qty: "0" })],
    };
    const errors = formErrors(budgetFormSchema, doc);

    expect(errors.items).toBe("Quantidade deve ser maior que zero.");
    expect(formIsValid(errors)).toBe(false);
  });

  test("recibo sem itens fica inválido", () => {
    const doc = { ...defaultReceipt(), cliente: "Padaria Aurora", items: [] };

    expect(formErrors(receiptFormSchema, doc).items).toBe(
      "Adicione pelo menos um item ao recibo.",
    );
  });

  test("recibo com cliente e item fica válido", () => {
    const doc = { ...defaultReceipt(), cliente: "Padaria Aurora" };

    expect(formIsValid(formErrors(receiptFormSchema, doc))).toBe(true);
  });
});

describe("regra de produto já adicionado", () => {
  test("o mesmo slug não pode entrar duas vezes", () => {
    const items = [budgetItem({ slug: "camera-1" })];
    expect(canAddBudgetProduct("camera-1", items)).toBe(false);
    expect(canAddBudgetProduct("camera-2", items)).toBe(true);
    expect(canAddBudgetProduct("camera-1", [])).toBe(true);
  });

  test("itens personalizados não bloqueiam produtos do catálogo", () => {
    expect(canAddBudgetProduct("camera-1", [budgetItem()])).toBe(true);
  });

  test("addedProductSlugs lista só os itens vindos do catálogo", () => {
    const slugs = addedProductSlugs([
      budgetItem({ slug: "camera-1" }),
      budgetItem(),
      budgetItem({ slug: "cabo-2" }),
    ]);
    expect([...slugs]).toEqual(["camera-1", "cabo-2"]);
  });
});

describe("histórico: entrada salva", () => {
  const signature = { raw: null, clean: true, name: "Maria" };

  test("orçamento guarda o total calculado", () => {
    const doc = {
      ...defaultBudget(),
      cliente: "Padaria Aurora",
      items: [
        { id: "1", desc: "Cabo", qty: "2", unit: "10,50" },
        { id: "2", desc: "Fonte", qty: "1", unit: "89,90" },
      ],
    };
    const entry = historyEntryFrom({
      id: "doc-1",
      mode: "orc",
      doc,
      signature,
      company: "jm",
    });

    expect(entry.mode).toBe("orc");
    expect(entry.cliente).toBe("Padaria Aurora");
    expect(entry.total).toBeCloseTo(110.9);
    expect(entry.signature).toEqual(signature);
  });

  test("recibo guarda o total dos valores lançados", () => {
    const doc = defaultReceipt();
    doc.cliente = "Mercado Bom Preço";
    doc.items = [{ id: "1", desc: "Instalação", valor: "300,00" }];
    const entry = historyEntryFrom({
      id: "doc-2",
      mode: "rec",
      doc,
      signature,
      company: "vision",
    });

    expect(entry.mode).toBe("rec");
    expect(entry.company).toBe("vision");
    expect(entry.total).toBe(300);
  });

  test("a data de gravação pode ser injetada", () => {
    const entry = historyEntryFrom(
      { id: "doc-3", mode: "orc", doc: defaultBudget(), signature, company: "jm" },
      "2026-01-01T00:00:00.000Z",
    );
    expect(entry.savedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(historyEntrySchema.safeParse(entry).success).toBe(true);
  });
});

describe("empresa emissora", () => {
  test("aceita só as empresas cadastradas", () => {
    expect(companyIdSchema.safeParse("jm").success).toBe(true);
    expect(companyIdSchema.safeParse("vision").success).toBe(true);
    expect(companyIdSchema.safeParse("outra").success).toBe(false);
  });

  test("valor salvo ausente ou desconhecido volta para a J&M", () => {
    expect(parseCompanyId("vision")).toBe("vision");
    expect(parseCompanyId(null)).toBe("jm");
    expect(parseCompanyId(undefined)).toBe("jm");
    expect(parseCompanyId("xyz")).toBe("jm");
  });

  test("cada empresa tem cabeçalho e dados de rodapé próprios", () => {
    for (const id of COMPANY_IDS) {
      const company = getCompany(id);
      expect(company.id).toBe(id);
      expect(company.headerSrc).toMatch(/^\/.+\.png$/);
      expect(company.phone && company.email && company.cnpj && company.signer).toBeTruthy();
    }
    expect(getCompany("jm").headerSrc).not.toBe(getCompany("vision").headerSrc);
  });

  test("J&M mantém as chaves antigas da assinatura; Vision Tech tem as suas", () => {
    expect(signatureKeys("jm")).toEqual({
      raw: "jm_sig_raw",
      clean: "jm_sig_clean",
      name: "jm_sig_name",
    });
    expect(signatureKeys("vision")).toEqual({
      raw: "jm_sig_raw_vision",
      clean: "jm_sig_clean_vision",
      name: "jm_sig_name_vision",
    });
  });

  test("entrada antiga do histórico, sem empresa, continua válida", () => {
    const entry = historyEntryFrom(
      {
        id: "doc-4",
        mode: "orc",
        doc: defaultBudget(),
        signature: { raw: null, clean: true, name: "" },
        company: "jm",
      },
      "2026-01-01T00:00:00.000Z",
    );
    const legacy: Record<string, unknown> = { ...entry };
    delete legacy.company;
    expect(historyEntrySchema.safeParse(legacy).success).toBe(true);
    expect(historyEntrySchema.safeParse({ ...entry, company: "outra" }).success).toBe(false);
  });
});

describe("histórico: texto do pedido de orçamento", () => {
  test("alinha a quantidade à direita de cada item", () => {
    const doc = {
      ...defaultBudget(),
      items: [
        { id: "1", desc: "Acionador manual", qty: "2", unit: "" },
        { id: "2", desc: "Amplificador SLIM 2500", qty: "1", unit: "" },
      ],
    };
    const lines = quoteText(doc).split("\n");

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("Acionador manual         2x");
    expect(lines[1]).toBe("Amplificador SLIM 2500   1x");
  });

  test("quantidade vazia conta como 1 e aceita decimais", () => {
    const doc = {
      ...defaultBudget(),
      items: [
        { id: "1", desc: "Cabo", qty: "", unit: "" },
        { id: "2", desc: "Fonte", qty: "2,5", unit: "" },
      ],
    };
    const lines = quoteText(doc).split("\n");

    expect(lines[0]).toBe("Cabo    1x");
    expect(lines[1]).toBe("Fonte   2,5x");
  });

  test("ignora itens sem descrição e devolve vazio sem itens", () => {
    expect(quoteText({ ...defaultBudget(), items: [] })).toBe("");
    expect(
      quoteText({
        ...defaultBudget(),
        items: [{ id: "1", desc: "   ", qty: "1", unit: "" }],
      }),
    ).toBe("");
  });
});

describe("histórico: prazo de 30 dias", () => {
  test("a constante representa 30 dias", () => {
    expect(HISTORY_TTL_DAYS).toBe(30);
    expect(HISTORY_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });

  test("vence só depois de 30 dias", () => {
    const savedAt = "2026-01-01T00:00:00.000Z";
    const saved = Date.parse(savedAt);

    expect(historyEntryExpired({ savedAt }, saved + HISTORY_TTL_MS)).toBe(false);
    expect(historyEntryExpired({ savedAt }, saved + HISTORY_TTL_MS + 1)).toBe(
      true,
    );
  });

  test("data inválida conta como vencida", () => {
    expect(historyEntryExpired({ savedAt: "ontem" })).toBe(true);
  });
});
