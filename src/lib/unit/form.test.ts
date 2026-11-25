import { describe, expect, test } from "vitest";

import {
  formErrors,
  formIsValid,
  isFieldInvalid,
  markDirty,
  type FormErrors,
} from "@/lib/form";
import {
  clientFieldsSchema,
  type ClientFieldsValue,
} from "@/lib/schemas/client";

const valido = {
  cliente: "Padaria Aurora",
  data: "2026-02-10",
  cnpjOn: false,
  cnpj: "",
};

describe("erros por campo", () => {
  test("schema válido devolve objeto vazio", () => {
    expect(formErrors(clientFieldsSchema, valido)).toEqual({});
  });

  test("guarda só a primeira mensagem de cada campo", () => {
    const errors = formErrors(clientFieldsSchema, {
      ...valido,
      cliente: "",
      data: "",
    });

    expect(errors.cliente).toBe("Informe o nome do cliente.");
    expect(errors.data).toBe("Informe a data.");
  });

  test("CNPJ vazio só é erro quando o campo está ligado", () => {
    expect(formErrors(clientFieldsSchema, valido).cnpj).toBeUndefined();
    expect(formErrors(clientFieldsSchema, { ...valido, cnpjOn: true }).cnpj).toBe(
      "Informe o CNPJ do cliente.",
    );
  });

  test("CNPJ exige 14 dígitos", () => {
    const errors = formErrors(clientFieldsSchema, {
      ...valido,
      cnpjOn: true,
      cnpj: "12.345.678/0000-1",
    });

    expect(errors.cnpj).toBe("Informe os 14 dígitos do CNPJ.");
  });

  test("CNPJ mascarado e completo passa", () => {
    const errors = formErrors(clientFieldsSchema, {
      ...valido,
      cnpjOn: true,
      cnpj: "12.345.678/0001-90",
    });

    expect(errors).toEqual({});
  });
});

describe("campos editados", () => {
  test("marca o campo sem alterar o objeto anterior", () => {
    const dirty = {};
    const next = markDirty(dirty, "cliente");

    expect(next).toEqual({ cliente: true });
    expect(dirty).toEqual({});
  });

  test("campo já marcado devolve o mesmo objeto", () => {
    const dirty = markDirty({}, "cliente");
    expect(markDirty(dirty, "cliente")).toBe(dirty);
  });
});

describe("formulário válido", () => {
  test("sem erros é válido", () => {
    expect(formIsValid({})).toBe(true);
  });

  test("qualquer erro invalida o formulário", () => {
    expect(
      formIsValid<ClientFieldsValue>({ data: "Informe a data." }),
    ).toBe(false);
  });
});

describe("campo inválido", () => {
  const errors: FormErrors<ClientFieldsValue> = {
    cliente: "Informe o nome do cliente.",
  };

  test("só fica inválido depois de editado", () => {
    expect(isFieldInvalid(errors, {}, "cliente")).toBe(false);
    expect(isFieldInvalid(errors, { cliente: true }, "cliente")).toBe(true);
  });

  test("campo sem erro nunca fica inválido", () => {
    expect(isFieldInvalid(errors, { data: true }, "data")).toBe(false);
  });
});
