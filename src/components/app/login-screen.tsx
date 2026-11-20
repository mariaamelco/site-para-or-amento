"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/app/brand-logo";
import { checkCredentials, persistAuth } from "@/lib/auth";
import { APP_VERSION } from "@/lib/version";

export function LoginScreen({ onSignIn }: { onSignIn: () => void }) {
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
      onSignIn();
    } else {
      setError("Usuário ou senha incorretos.");
      document.getElementById("lg-pass")?.focus();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black bg-[radial-gradient(circle_at_50%_0,#2a0b0b_0,#000_65%)] px-4">
      <div className="w-full max-w-[380px] overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <div className="flex justify-center border-b-4 border-brand bg-black px-5 py-6">
          <BrandLogo />
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
