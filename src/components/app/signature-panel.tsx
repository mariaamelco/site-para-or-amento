/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState, type DragEvent } from "react";
import { ImageUp, PenLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Notice } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  raw: string | null;
  clean: boolean;
  name: string;
  notice: Notice;
  onFile: (file: File) => void;
  onCleanChange: (clean: boolean) => void;
  onNameChange: (name: string) => void;
  onReset: () => void;
}

export function SignaturePanel({
  raw,
  clean,
  name,
  notice,
  onFile,
  onCleanChange,
  onNameChange,
  onReset,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <PenLine className="size-4 text-brand" />
          Assinatura
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex min-h-[112px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-4 text-center transition-colors",
            dragging
              ? "border-brand bg-brand/5"
              : "hover:border-brand/60 hover:bg-neutral-50",
          )}
        >
          {raw ? (
            <>
              <img
                src={raw}
                alt="Assinatura"
                className="max-h-[110px] max-w-full object-contain"
              />
              <span className="text-[11.5px] text-muted-foreground">
                Clique ou arraste para trocar
              </span>
            </>
          ) : (
            <>
              <ImageUp className="size-5 text-muted-foreground" />
              <span className="text-[13px] font-medium">
                Clique ou arraste a foto da assinatura
              </span>
              <span className="text-[11.5px] text-muted-foreground">
                PNG ou JPG, fundo claro
              </span>
            </>
          )}
        </button>

        <Label htmlFor="sig-clean" className="text-[13px] font-normal">
          <Checkbox
            id="sig-clean"
            checked={clean}
            onCheckedChange={(checked) => onCleanChange(checked === true)}
          />
          Remover o fundo branco do papel
        </Label>

        <div className="grid gap-1.5">
          <Label htmlFor="sig-name" className="text-[12.5px] text-muted-foreground">
            Nome de quem assina
          </Label>
          <Input
            id="sig-name"
            className="h-9"
            maxLength={40}
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
          />
        </div>

        {raw ? (
          <Button type="button" variant="outline" size="sm" onClick={onReset}>
            <Trash2 />
            Remover assinatura
          </Button>
        ) : null}

        <p
          role="status"
          className={cn(
            "min-h-[18px] text-[12.5px]",
            notice.kind === "err"
              ? "text-brand"
              : notice.kind === "ok"
                ? "text-emerald-600"
                : "text-muted-foreground",
          )}
        >
          {notice.text}
        </p>
      </CardContent>
    </Card>
  );
}
