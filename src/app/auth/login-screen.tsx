"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";
import { checkCredentials, persistAuth } from "@/lib/auth";
import { COMPANIES, COMPANY_IDS, type CompanyId } from "@/lib/companies";
import { useCompany } from "@/lib/hooks/company";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";

/** Escolha da empresa que vai emitir os documentos (dá para trocar depois no topo). */
function CompanyPicker({
  value,
  onChange,
}: {
  value: CompanyId;
  onChange: (company: CompanyId) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <span id="lg-company" className="text-[13px] font-medium text-muted-foreground">
        Empresa
      </span>
      <div role="radiogroup" aria-labelledby="lg-company" className="grid grid-cols-2 gap-2">
        {COMPANY_IDS.map((id) => {
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={COMPANIES[id].name}
              onClick={() => onChange(id)}
              className={cn(
                "flex h-16 items-center justify-center rounded-lg bg-black px-2 ring-offset-2 outline-none transition focus-visible:ring-2 focus-visible:ring-brand",
                selected ? "ring-2 ring-brand" : "opacity-60 hover:opacity-90",
              )}
            >
              <span className="pointer-events-none origin-center scale-[0.8]">
                <BrandLogo company={id} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function LoginScreen() {
  const [company, setCompany] = useCompany();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [keep, setKeep] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (checkCredentials(user, pass)) {
      persistAuth(keep);
      setError("");
      setPass("");
      // Navegação completa para o proxy enxergar o cookie recém-gravado.
      window.location.replace("/");
    } else {
      setError("Usuário ou senha incorretos.");
      document.getElementById("lg-pass")?.focus();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black bg-[radial-gradient(circle_at_50%_0,#2a0b0b_0,#000_65%)] px-4">
      <div className="w-full max-w-[380px] overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <div
          className="flex justify-center border-b-4 bg-black px-5 py-6"
          style={{ borderBottomColor: COMPANIES[company].accent }}
        >
          <BrandLogo company={company} />
        </div>
        <form className="flex flex-col gap-3 p-5" onSubmit={handleSubmit} autoComplete="on">
          <div>
            <h1 className="text-lg font-semibold">Entrar</h1>
            <p className="mt-1 text-[13.5px] text-muted-foreground">
              Acesse o sistema de orçamentos e recibos.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lg-user" className="text-[13px] text-muted-foreground">
              Usuário
            </Label>
            <Input
              id="lg-user"
              name="username"
              autoComplete="username"
              className="h-10"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lg-pass" className="text-[13px] text-muted-foreground">
              Senha
            </Label>
            <Input
              id="lg-pass"
              name="password"
              type="password"
              autoComplete="current-password"
              className="h-10"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
            />
          </div>
          <CompanyPicker value={company} onChange={setCompany} />
          <Label htmlFor="lg-keep" className="text-sm font-normal">
            <Checkbox
              id="lg-keep"
              checked={keep}
              onCheckedChange={(checked) => setKeep(checked === true)}
            />
            Manter conectado neste aparelho
          </Label>
          <div role="alert" className="min-h-[18px] text-[13px] text-brand">
            {error}
          </div>
          <Button type="submit" className="h-11 w-full">
            Entrar
          </Button>
          <p className="text-center text-[11.5px] text-muted-foreground">v{APP_VERSION}</p>
        </form>
      </div>
    </div>
  );
}
