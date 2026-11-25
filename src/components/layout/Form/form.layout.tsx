"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { z } from "zod";

import {
  formErrors,
  formIsValid,
  isFieldInvalid,
  markDirty,
  type FormDirty,
  type FormErrors,
} from "@/lib/form";

/**
 * Estado do formulário. Os valores continuam sendo do documento (quem chama
 * mantém a fonte da verdade); o contexto guarda apenas os campos editados e os
 * erros derivados do schema zod.
 */
export interface FormContextValue<T extends object> {
  values: T;
  /** Campos já editados pelo usuário nesta sessão. */
  dirty: FormDirty<T>;
  /** Primeiro erro de cada campo, segundo o schema. */
  errors: FormErrors<T>;
  /** `true` quando nenhum campo tem erro — independe de estar `dirty`. */
  isValid: boolean;
  /** Prefixo dos ids gerados (`<prefixo>-<campo>`). */
  idPrefix?: string;
  /** Editado e com erro no schema. */
  isInvalid: (name: keyof T) => boolean;
  setField: <K extends keyof T & string>(name: K, value: T[K]) => void;
}

type AnyForm = FormContextValue<Record<string, unknown>>;

const FormContext = createContext<AnyForm | null>(null);

export interface FormLayoutProps<T extends object> {
  /** Schema zod que tipa os valores e define o erro de cada campo. */
  schema: z.ZodType<T>;
  /** Valores atuais. Quem chama continua dono do estado. */
  values: T;
  /** Recebe apenas o campo alterado. */
  onValuesChange: (patch: Partial<T>) => void;
  idPrefix?: string;
  children: ReactNode;
}

/**
 * Contexto de formulário: valores tipados por um schema zod, campos `dirty` e
 * erros por campo. Não guarda cópia própria dos valores — cada mudança sobe por
 * `onValuesChange`.
 */
export function Form<T extends object>({
  schema,
  values,
  onValuesChange,
  idPrefix,
  children,
}: FormLayoutProps<T>) {
  const [dirty, setDirty] = useState<FormDirty<T>>({});
  const errors = useMemo(() => formErrors(schema, values), [schema, values]);

  const setField = useCallback(
    <K extends keyof T & string,>(name: K, value: T[K]) => {
      setDirty((previous) => markDirty(previous, name));
      onValuesChange({ [name]: value } as unknown as Partial<T>);
    },
    [onValuesChange],
  );

  const value = useMemo<FormContextValue<T>>(
    () => ({
      values,
      dirty,
      errors,
      isValid: formIsValid(errors),
      idPrefix,
      isInvalid: (name) => isFieldInvalid(errors, dirty, name),
      setField,
    }),
    [values, dirty, errors, idPrefix, setField],
  );

  return (
    <FormContext.Provider value={value as unknown as AnyForm}>
      {children}
    </FormContext.Provider>
  );
}

export function useFormContext<T extends object>(): FormContextValue<T> {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useFormContext precisa estar dentro de <Form>.");
  }
  return context as unknown as FormContextValue<T>;
}

/**
 * Diz se o formulário do contexto está válido. Fica fora do `useFormContext`
 * para quem só precisa do `isValid` (ex.: habilitar ações de exportação).
 */
export function useFormValidity(): boolean {
  return useFormContext<Record<string, unknown>>().isValid;
}
