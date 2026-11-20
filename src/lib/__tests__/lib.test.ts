import { describe, expect, test } from "bun:test";

import {
  catalogCategories,
  highlightSegments,
  parseCatalog,
  searchProducts,
} from "@/lib/catalog";
import { documentName } from "@/lib/document/download";
import { defaultBudget, defaultReceipt } from "@/lib/documents";
import { brDate, fmt, maskCNPJ, parseMoney, productId } from "@/lib/format";
import { budgetTotal, receiptTotal } from "@/lib/totals";
import type { BudgetDoc } from "@/lib/types";

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
