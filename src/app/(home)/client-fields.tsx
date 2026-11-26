"use client";

import { UserRound } from "lucide-react";
import {
  Form,
  useFormContext,
} from "@/components/layout/Form/form.layout";
import { InputLayout } from "@/components/layout/Form/input/input.layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { maskCNPJ } from "@/lib/format";
import {
  clientFieldsSchema,
  type ClientFieldsValue,
} from "@/lib/schemas/client";

interface Props {
  idPrefix: "o" | "r";
  cliente: string;
  data: string;
  cnpjOn: boolean;
  cnpj: string;
  onChange: (patch: Partial<ClientFieldsValue>) => void;
}

/** Campos ligados ao contexto de formulário criado por `ClientFields`. */
function ClientFieldsBody({ idPrefix }: { idPrefix: "o" | "r" }) {
  const form = useFormContext<ClientFieldsValue>();

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
        <InputLayout<ClientFieldsValue>
          name="cliente"
          label="Nome do cliente"
          autoComplete="off"
          placeholder="Nome ou empresa"
        />
        <InputLayout<ClientFieldsValue> name="data" label="Data" type="date" />
      </div>
      <Label htmlFor={`${idPrefix}-cnpj`} className="text-[13px] font-normal">
        <Checkbox
          id={`${idPrefix}-cnpj`}
          checked={form.values.cnpjOn}
          onCheckedChange={(checked) =>
            form.setField("cnpjOn", checked === true)
          }
        />
        Incluir CNPJ no documento
      </Label>
      {form.values.cnpjOn ? (
        <InputLayout<ClientFieldsValue>
          name="cnpj"
          id={`${idPrefix}-cnpj-val`}
          label="CNPJ do cliente"
          className="sm:max-w-[260px]"
          inputMode="numeric"
          placeholder="00.000.000/0000-00"
          format={maskCNPJ}
        />
      ) : null}
    </>
  );
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
        <Form
          schema={clientFieldsSchema}
          idPrefix={idPrefix}
          values={{ cliente, data, cnpjOn, cnpj }}
          onValuesChange={onChange}
        >
          <ClientFieldsBody idPrefix={idPrefix} />
        </Form>
      </CardContent>
    </Card>
  );
}
