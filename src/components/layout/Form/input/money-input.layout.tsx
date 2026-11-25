"use client";

import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/money-input";
import { cn } from "@/lib/utils";
import {
  FieldError,
  fieldSizeClass,
  useFieldBinding,
  type FieldSize,
  type TextField,
} from "../field";

export interface MoneyInputLayoutProps<T extends object> {
  /** Campo do formulário que este input edita. */
  name: TextField<T>;
  label: string;
  /** `sm` para linhas densas (ex.: itens do orçamento). */
  size?: FieldSize;
  id?: string;
  className?: string;
}

/**
 * `MoneyInput` especializado: mesma ligação com o formulário do contexto, com
 * borda e mensagem de erro quando o campo está inválido.
 */
export function MoneyInputLayout<T extends object>({
  name,
  label,
  size = "default",
  id,
  className,
}: MoneyInputLayoutProps<T>) {
  const field = useFieldBinding<T>(name, id);
  const sizes = fieldSizeClass[size];

  return (
    <div
      data-variant={field.invalid ? "invalid" : "default"}
      className={cn("grid gap-1.5", className)}
    >
      <Label
        htmlFor={field.fieldId}
        className={cn(sizes.label, "text-muted-foreground")}
      >
        {label}
      </Label>
      <MoneyInput
        id={field.fieldId}
        className={cn(size === "sm" && "[&_input]:h-9")}
        value={field.value}
        onValueChange={field.setValue}
        aria-invalid={field.invalid || undefined}
        aria-describedby={field.invalid ? field.errorId : undefined}
      />
      {field.invalid ? (
        <FieldError id={field.errorId} error={field.error} />
      ) : null}
    </div>
  );
}
