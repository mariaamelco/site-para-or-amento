import type { z } from "zod";

/** Campos já editados pelo usuário nesta sessão. */
export type FormDirty<T extends object> = Partial<Record<keyof T, boolean>>;

/** Primeiro erro de cada campo, segundo o schema zod. */
export type FormErrors<T extends object> = Partial<Record<keyof T, string>>;

/**
 * Erros por campo a partir de um schema zod. Só a primeira mensagem de cada
 * campo é mantida, para exibir uma mensagem por input.
 */
export function formErrors<T extends object>(
  schema: z.ZodType<T>,
  values: T,
): FormErrors<T> {
  const result = schema.safeParse(values);
  if (result.success) return {};

  const errors: Partial<Record<string, string>> = {};
  for (const issue of result.error.issues) {
    const [field] = issue.path;
    if (typeof field === "string" && errors[field] === undefined) {
      errors[field] = issue.message;
    }
  }
  return errors as FormErrors<T>;
}

/** Marca um campo como editado, sem mutar o estado anterior. */
export function markDirty<T extends object>(
  dirty: FormDirty<T>,
  name: keyof T,
): FormDirty<T> {
  if (dirty[name]) return dirty;
  return { ...dirty, [name]: true };
}

/** O formulário só está válido quando nenhum campo tem erro. */
export function formIsValid<T extends object>(errors: FormErrors<T>): boolean {
  return Object.keys(errors).length === 0;
}

/** O campo só aparece inválido depois que o usuário o editou. */
export function isFieldInvalid<T extends object>(
  errors: FormErrors<T>,
  dirty: FormDirty<T>,
  name: keyof T,
): boolean {
  return dirty[name] === true && typeof errors[name] === "string";
}
