"use client";

import { useId } from "react";

import { useFormContext } from "./form.layout";

/** Campos de texto: só aceita chaves cujo valor é `string`. */
export type TextField<T extends object> = {
  [K in keyof T]-?: T[K] extends string ? K : never;
}[keyof T] &
  string;

/** Altura do input e tamanho do rótulo; `sm` para linhas densas. */
export const fieldSizeClass = {
  default: { label: "text-[12.5px]", input: "h-10" },
  sm: { label: "text-[11.5px]", input: "h-9" },
} as const;

export type FieldSize = keyof typeof fieldSizeClass;

/**
 * Liga um campo ao formulário do contexto: id estável, erro, variante e setter
 * daquele campo. Cada input especializado usa isso em vez de ler o contexto.
 */
export function useFieldBinding<T extends object>(
  name: TextField<T>,
  id?: string,
) {
  const form = useFormContext<T>();
  const generatedId = useId();
  const fieldId =
    id ??
    (form.idPrefix ? `${form.idPrefix}-${name}` : `${generatedId}-${name}`);
  const invalid = form.isInvalid(name);
  const error = form.errors[name];

  return {
    fieldId,
    errorId: `${fieldId}-error`,
    invalid,
    error,
    value: String(form.values[name] ?? ""),
    setValue: (value: string) => form.setField(name, value as T[TextField<T>]),
  };
}

/** Mensagem de erro do campo, exibida abaixo do input. */
export function FieldError({
  id,
  error,
}: {
  id: string;
  error: string | undefined;
}) {
  if (!error) return null;

  return (
    <p id={id} role="alert" className="text-[11.5px] text-destructive">
      {error}
    </p>
  );
}
