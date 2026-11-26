"use client";

import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  FieldError,
  fieldSizeClass,
  useFieldBinding,
  type FieldSize,
  type TextField,
} from "../field";

export type { TextField } from "../field";

/** Variante visual do input, decidida pelo próprio campo. */
export type InputLayoutVariant = "default" | "invalid";

export interface InputLayoutProps<T extends object> {
  /** Campo do formulário que este input edita. */
  name: TextField<T>;
  label: string;
  /** `sm` para linhas densas (ex.: itens do orçamento). */
  size?: FieldSize;
  id?: string;
  className?: string;
  type?: ComponentProps<"input">["type"];
  inputMode?: ComponentProps<"input">["inputMode"];
  autoComplete?: string;
  placeholder?: string;
  /** Transforma o texto antes de gravar (ex.: `maskCNPJ`). */
  format?: (value: string) => string;
}

/**
 * `Input` especializado: pega o formulário do contexto, grava só o campo que
 * recebe em `name` e decide sozinho se está inválido (variante `invalid`).
 */
export function InputLayout<T extends object>({
  name,
  label,
  size = "default",
  id,
  className,
  format,
  ...inputProps
}: InputLayoutProps<T>) {
  const field = useFieldBinding<T>(name, id);
  const variant: InputLayoutVariant = field.invalid ? "invalid" : "default";
  const sizes = fieldSizeClass[size];

  function handleChange(raw: string) {
    field.setValue(format ? format(raw) : raw);
  }

  return (
    <div data-variant={variant} className={cn("grid gap-1.5", className)}>
      <Label
        htmlFor={field.fieldId}
        className={cn(sizes.label, "text-muted-foreground")}
      >
        {label}
      </Label>
      <Input
        {...inputProps}
        id={field.fieldId}
        className={sizes.input}
        value={field.value}
        aria-invalid={variant === "invalid" || undefined}
        aria-describedby={variant === "invalid" ? field.errorId : undefined}
        onChange={(event) => handleChange(event.target.value)}
      />
      {variant === "invalid" ? (
        <FieldError id={field.errorId} error={field.error} />
      ) : null}
    </div>
  );
}
