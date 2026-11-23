"use client";

import { UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskCNPJ } from "@/lib/format";

interface Props {
  idPrefix: "o" | "r";
  cliente: string;
  data: string;
  cnpjOn: boolean;
  cnpj: string;
  onChange: (patch: {
    cliente?: string;
    data?: string;
    cnpjOn?: boolean;
    cnpj?: string;
  }) => void;
}

export function ClientFields({
  idPrefix,
  cliente,
  data,
  cnpjOn,
  cnpj,
  onChange,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <UserRound className="size-4 text-brand" />
          Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
          <div className="grid gap-1.5">
            <Label
              htmlFor={`${idPrefix}-cliente`}
              className="text-[12.5px] text-muted-foreground"
            >
              Nome do cliente
            </Label>
            <Input
              id={`${idPrefix}-cliente`}
              className="h-10"
              autoComplete="off"
              placeholder="Nome ou empresa"
              value={cliente}
              onChange={(event) => onChange({ cliente: event.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label
              htmlFor={`${idPrefix}-data`}
              className="text-[12.5px] text-muted-foreground"
            >
              Data
            </Label>
            <Input
              id={`${idPrefix}-data`}
              type="date"
              className="h-10"
              value={data}
              onChange={(event) => onChange({ data: event.target.value })}
            />
          </div>
        </div>
        <Label htmlFor={`${idPrefix}-cnpj`} className="text-[13px] font-normal">
          <Checkbox
            id={`${idPrefix}-cnpj`}
            checked={cnpjOn}
            onCheckedChange={(checked) => onChange({ cnpjOn: checked === true })}
          />
          Incluir CNPJ no documento
        </Label>
        {cnpjOn ? (
          <div className="grid gap-1.5 sm:max-w-[260px]">
            <Label
              htmlFor={`${idPrefix}-cnpj-val`}
              className="text-[12.5px] text-muted-foreground"
            >
              CNPJ do cliente
            </Label>
            <Input
              id={`${idPrefix}-cnpj-val`}
              className="h-10"
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              value={cnpj}
              onChange={(event) => onChange({ cnpj: maskCNPJ(event.target.value) })}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
