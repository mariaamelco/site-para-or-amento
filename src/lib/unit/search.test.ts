import { describe, expect, test } from "vitest";

import {
  buildNameIndex,
  searchNameIndex,
  sellersDistance,
  toleranceFor,
} from "@/lib/search";

function indexOf(...names: string[]) {
  return buildNameIndex(names, (name) => name);
}

function found(index: ReturnType<typeof indexOf>, term: string) {
  return searchNameIndex(index, term).entries.map((entry) => entry.nome);
}

describe("busca em duas camadas", () => {
  test("termo vazio devolve lista vazia", () => {
    expect(found(indexOf("Mariana"), "")).toEqual([]);
    expect(found(indexOf("Mariana"), "   ")).toEqual([]);
  });

  test("busca por trecho, não só por prefixo: ana encontra Mariana", () => {
    const index = indexOf("Mariana", "Ana Paula", "João Pedro Silva");
    const result = found(index, "ana");

    expect(result).toContain("Mariana");
    // "Ana Paula" começa com o termo, então vem antes.
    expect(result[0]).toBe("Ana Paula");
  });

  test("todos os tokens precisam aparecer, em qualquer ordem", () => {
    const index = indexOf("João Pedro Silva", "João Paulo");
    expect(found(index, "pedro joao")).toEqual(["João Pedro Silva"]);
    expect(found(index, "joao maria")).toEqual([]);
  });

  test("fuzzy encontra Mariana a partir de mariena", () => {
    const index = indexOf("Mariana", "João Pedro Silva", "Cabo HDMI");
    expect(found(index, "mariena")).toContain("Mariana");
  });

  test("fuzzy encontra João Pedro Silva a partir de joao pedo", () => {
    const index = indexOf("João Pedro Silva", "Mariana");
    expect(found(index, "joao pedo")).toContain("João Pedro Silva");
  });

  test("fuzzy só roda quando a camada exata tem menos de 5 resultados", () => {
    const exatos = ["Câmera 1", "Câmera 2", "Câmera 3", "Câmera 4"];
    const fuzzy = "Camela";

    const quatro = found(indexOf(...exatos, fuzzy), "camera");
    expect(quatro.slice(0, 4)).toEqual(exatos);
    expect(quatro).toContain(fuzzy);

    const cinco = found(indexOf(...exatos, "Câmera 5", fuzzy), "camera");
    expect(cinco).toHaveLength(5);
    expect(cinco).not.toContain(fuzzy);
  });

  test("a camada fuzzy não reordena os resultados exatos", () => {
    const exatos = ["Câmera A", "Câmera B", "Câmera C"];
    const result = found(indexOf(...exatos, "Camela"), "camera");

    expect(result.slice(0, 3)).toEqual(exatos);
    expect(result[3]).toBe("Camela");
  });
});

describe("pontuação e tolerância", () => {
  test("ordena por nome (3), palavra (2) e trecho (1)", () => {
    const index = indexOf("Micro Câmera", "Câmera Intelbras", "Câmera VHD");
    expect(found(index, "camera")).toEqual([
      "Câmera Intelbras",
      "Câmera VHD",
      "Micro Câmera",
    ]);
  });

  test("tolerância por tamanho do token", () => {
    expect(toleranceFor("ana")).toBe(0);
    expect(toleranceFor("maria")).toBe(1);
    expect(toleranceFor("mariena")).toBe(2);
  });

  test("Sellers mede erros em qualquer trecho do nome", () => {
    expect(sellersDistance("ana", "mariana")).toBe(0);
    expect(sellersDistance("mariena", "mariana")).toBe(1);
    expect(sellersDistance("joao", "joao pedro silva")).toBe(0);
    expect(sellersDistance("pedo", "joao pedro silva")).toBe(1);
  });

  test("tokens com até 3 letras não entram no fuzzy", () => {
    const index = indexOf("Mauá", "Mariana");
    expect(found(index, "mai")).toEqual([]);
  });
});
